import { redisGet, redisSet } from '../../expenseTracker-auth-service/utils/redisUtility.js';
import { consumer, producer, TOPICS } from '../config/kafka.js';
import { adjustAccountBalanceService } from '../src/service/accountService.js';

const MAX_RETRY=3;

//exponential back-offs(ms)
const RETRY_DELAYS =[10000, 30000, 60000]; //10s, 30s, 60s

//--------------Core business Logic-----------------
const processTransactionEvent=async(event)=>{
    // const {eventType, data} = event;

    if (event.eventType === "transaction.created") {
        const { accountId, amount, type, userId } = event.data;
        console.log('Value of event.data:', event.data);

        const adjustment = type === 'debit' ? -Number(amount) : Number(amount);

        await adjustAccountBalanceService({
            accountId,
            userId,
            amount: adjustment,
            eventType: event.eventType,
        });
    }

    if (event.eventType === "transaction.updated") {
        const { accountId, userId, old, updated } = event.data;

        if (updated.amount !== undefined || updated.type !== undefined) {

            const oldAmt = Number(old.amount);
            const newAmt = Number(updated.amount ?? old.amount);

            const oldType = old.type;
            const newType = updated.type ?? old.type;

            const oldImpact = oldType === 'debit' ? -oldAmt : oldAmt;
            const newImpact = newType === 'debit' ? -newAmt : newAmt;

            const adjustment = newImpact - oldImpact;
            console.log("💰 Adjustment:", adjustment);

            if (adjustment !== 0) {
                await adjustAccountBalanceService({
                    accountId,
                    userId,
                    amount: adjustment,
                    eventType: event.eventType,
                });
            }
        }
    }

    if (event.eventType === "transaction.deleted") {
        const { accountId, amount, type, userId } = event.data;

        const adjustment = type === 'debit' ? Number(amount) : -Number(amount);

        await adjustAccountBalanceService({
            accountId,
            userId,
            amount: adjustment,
            eventType: event.eventType,
        });
    }
}
// 🔁 Retry / DLQ handler with delay
const handleFailure = async (event, err, retryCount = 0) => {
    console.error(`❌ Processing failed. RetryCount=${retryCount}`, err.message);

    if (retryCount < MAX_RETRY) {
        console.log(`🔁 Sending to RETRY topic (attempt ${retryCount + 1})`);

        const delay = RETRY_DELAYS[retryCount] || 60000;
        const retryAt = Date.now() + delay;
        await producer.send({
            topic: TOPICS.RETRY,
            messages: [
                {
                    key: event.data?.userId || "unknown",
                    value: JSON.stringify(event),
                    headers: {
                        retryCount: String(retryCount + 1),
                        retryAt:String(retryAt),
                    },
                },
            ],
        });
    } else {
        console.log("💀 Sending to DLQ");

        await producer.send({
            topic: TOPICS.DLQ,
            messages: [
                {
                    key: event.data?.userId || "unknown",
                    value: JSON.stringify({
                        failedEvent: event,
                        error: err.message,
                        failedAt: new Date().toISOString(),
                    }),
                },
            ],
        });
    }
};


//---------------consumer bootstrap-----------------
export const startTransactionConsumer = async () => {
    await consumer.connect();
    await producer.connect();

    await consumer.subscribe({topic:TOPICS.MAIN, fromBeginning:false});
    await consumer.subscribe({topic:TOPICS.RETRY, fromBeginning:false});

    console.log("📥 Account Service listening to Kafka...");

    await consumer.run({
        autoCommit:true,

        eachMessage: async ({ message, topic }) => {

            const raw = message.value?.toString();
            console.log("📩 RAW MESSAGE:", raw); 
            if(!raw){
                console.warn("Empty kafka message");
                return;
            }
            let event;
            try{
                event = JSON.parse(raw);
            }catch(e){
                console.error("❌ Invalid JSON message");
                return;
            }
             

            const eventId = event.eventId;
            console.log('✅ Event received:', event);
            console.log("Value of message:",message);

            const retryCount = Number(message.headers?.retryCount||0);
            const retryAt = Number(message.headers?.retryAt || 0);
            
             
            console.log(`📩 Event received [${topic}]`, eventId);   

            try {
                if(topic===TOPICS.RETRY && retryAt>Date.now()){
                    console.log("⏳ Not yet time, re-queueing...");
                    await producer.send({
                        topic:TOPICS.RETRY,
                        messages:[message],
                    });
                    return;
                }
                // 🔐 Idempotency
                if (await redisGet(eventId)) {
                    console.log("⚠️ Duplicate event skipped:", eventId);
                    return;
                }
                await processTransactionEvent(event);
                
                // ✅ mark processed
                await redisSet(eventId, "processed", "EX", 86400); //expires in 1 day

            } catch (err) {
                await handleFailure(event, err, retryCount);    
            }
        }
    });
};