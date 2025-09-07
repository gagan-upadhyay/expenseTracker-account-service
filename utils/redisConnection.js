import { createClient } from "redis";

export const redisClient = createClient({
    username:'XXXXXXXXXXX',
    password:'XXXXXXXXXXX',
    socket:{
        host:'xxxxxxxxxxxxxxxxxxxxxxxxxxx',
        port:000000
    }
});

redisClient.on('error', err=>console.log('Redis client error:', err));
await redisClient.connect();

