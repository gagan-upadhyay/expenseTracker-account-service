// import { error } from "winston";
import { knexDB } from "../../config/knex.js";
import { logger } from "../../config/logger.js";
// import { convertCurrency } from "../../utils/currencyUtility.js";
import { checkResourceStatus } from "../helpers/checkResourceStatus.js";
import { findByUserId } from "../models/Account.js";
import { createAccountService,
    deleteService,
    fetchAccountDetails,
    fetchAllCardsService,
    fetchCardDetailsService,
    getAccountByUser,
    isResourceActive,
    saveCardDetailsService
} from "../service/accountService.js";


//----------------------------------------------------
const getLogContext =(req, context)=> ({
    context: context, 
    route:req.OriginalUrl,
    method:req.method,
    status:req.statusCode,
    userId: req.user?.id, 
    accountId: req.params.id, 
    requestId: req.headers['x-request-id']
})



// accountService/controllers/accountController.js
import { getExchangeRates, convertValue } from '../../utils/currencyUtility.js';

export async function fetchAllAccounts(req, res) {
    const logDetails = getLogContext(req, "AccountService:fetchAllAccounts");
    try {
        const userId = req.user.id;
        const targetCurrency = req.query.base_currency || 'INR'; // Fallback to INR

        const accounts = await findByUserId(userId);
        // console.log('value of accounts:',accounts);

        const rates = await getExchangeRates();

        let totalBalance = 0;
        let totalIncome = 0;
        let totalExpense = 0;

        const processedAccounts = accounts.map(acc => {
            const balance = Number(acc.remaining_balance);
            const income = Number(acc.total_income);
            const expense = Number(acc.total_expense);

            // Convert everything to the base_currency for the totals
            const convertedBalance = convertValue(balance, acc.currency_code, targetCurrency, rates);
            const convertedIncome = convertValue(income, acc.currency_code, targetCurrency, rates);
            const convertedExpense = convertValue(expense, acc.currency_code, targetCurrency, rates);

            // Logic: Liability reduces the total net worth
            if (acc.is_liability) {
                totalBalance -= convertedBalance;
            } else {
                totalBalance += convertedBalance;
            }

            totalIncome += convertedIncome;
            totalExpense += convertedExpense;

            return acc; // Keep original account data for the card display
        });
        console.log('value of processedAccounts:', processedAccounts);
        console.log('value of totals:', totalBalance.toFixed(2), totalIncome, totalExpense);
        res.json({
            success: true,
            accounts: processedAccounts??accounts,
            totals: {
                netWorth: totalBalance.toFixed(2),
                income: totalIncome.toFixed(2),
                expense: totalExpense.toFixed(2),
                currency: targetCurrency
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}


//--------------------------------------------------------------------------------------------
export async function createAccountController(req, res) {
    const logDetails = getLogContext(req, "AccountService:Create")
    try {
        // console.log("value of req.user.id from controller:\n",req.user.id);
        const userId = req.user.id;
        console.log(`Value of req.body: ${req}`);
        const {currencyCode, openingBalance, totalIncome, totalExpense, accountType}= req.body;
        const result = await createAccountService(
            (req.user.id),
            accountType, //string
            currencyCode, //string
            openingBalance, //number
            totalExpense, //number 
            totalIncome //number
        );
        
        if(!result){
            logger.warn("Account creation result no result", logDetails);
            return res.status(404).json({success:false, 
                error: "Unable to fill account table, check inputs",   
            });
        }
        logger.info(`Account created successfully`, {...logDetails, accountId:result.id});
        
        return res.status(201).json({success:true, message:"User's account details are successfully stored", id:result.id});

    }catch(err) {
        logger.error("Unable to fill account table", {...logDetails, error:err.message, stack:err.stack});
        return res.status(500).json({success:false, error:'Something went wrong! please try again later'})
    }
}
//--------------------------------------------------------------------------------------------

//fetch all the accounts hold by the user using userId

export async function getAccountByUserController(req, res){
    const logDetails = getLogContext(req, "AccountService:FetchByUser");
    try{
        
        const userExists = await getAccountByUser(req.user.id);
        
        if(!userExists){
            logger.error("user details not found", logDetails);
            return res.status(404).json({success:false, error:'user details not found'});
        }
        logger.info("Successfully fetched the details", logDetails);
        return res.status(200).json({success:true, message:'Fetched successfully', data:userExists});
    }catch(err){
        logger.error("Error while fetching account details", {...logDetails, error:err.message, stack:err.stack});
        return res.status(500).json({success:false, error:'Failed to fetch the accounts details at the moment, please try again later'});
    }
}

//get account details using :accountId

export async function getAccountByIDController(req, res){
    const logDetails=getLogContext(req, "AccountService:FetchByAccountID");
    try{
        const accountId = req.params.accountId;

        const userId = req.user.id;
        console.log('Value of accountId:', accountId);
        // await checkResourceStatus(res, accountId, null, userId, 'account')

        const {ok, code, message} = await checkResourceStatus({accountId, cardId:null, userId, flag:'accounts'});

        if(!ok) {
            logger.error('Resource status check failed', {...logDetails, errorCode:code, error:message});
            return res.status(code).json({success:false, error:message});}

        const accountDetails = await fetchAccountDetails(userId, accountId);
        if(accountDetails?.error){
            logger.error("Failed to retrieve account details",{...logDetails, error:accountDetails.error});
            return res.status(400).json({success:false, message:'Unable to get account details', error:error});
        }else if(!accountDetails) {
            logger.error(
                "Illegal use of API", logDetails);
        }
        logger.info("Account fetched successfully!",logDetails);  
        return res.status(200).json({success:true, message:'Account deatils fetched successfully!', data:accountDetails});


    }catch(err){
        console.error(`Error while fetching account:${err}`);
        logger.error("Critical error in getAccountById", {...logDetails, error:err.message, stack:err.stack});
        return res.status(500).json({success:false, error:'Something went wrong, please try again later!'});
    }
}
//--------------------------------------------------------------------------------------------

export async function adjustAccountBalance(req, res) {
    const { accountId } = req.params;
    const { amount, userId, isDeletion } = req.body;

    try {
        await knexDB.transaction(async (trx) => {
            const account = await trx('accounts')
                .where({ id: accountId, user_id: userId })
                .forUpdate().first(); // Re-added forUpdate for safety

            if (!account) throw new Error("Account not found");

            const change = Number(amount);
            const absChange = Math.abs(change);
            
            // 🔥 IMPORTANT: We do NOT include remaining_balance here.
            // The DB handles it automatically based on these two:
            let updatePayload = {};

            if (change < 0) {
                if (isDeletion) {
                    // Deleting Income (Credit)
                    updatePayload.total_income = Number(account.total_income) - absChange;
                } else {
                    // Adding Expense (Debit)
                    updatePayload.total_expense = Number(account.total_expense) + absChange;
                }
            } else {
                if (isDeletion) {
                    // Deleting Expense (Debit)
                    updatePayload.total_expense = Number(account.total_expense) - absChange;
                } else {
                    // Adding Income (Credit)
                    updatePayload.total_income = Number(account.total_income) + absChange;
                }
            }

            console.log('Updating source columns:', updatePayload);

            await trx('accounts')
                .where({ id: accountId })
                .update(updatePayload);
        });

        res.json({ success: true, message: "Source columns updated, balance recalculated by DB" });
    } catch (err) {
        console.error("❌ DB Update Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
}



//---------------------------------------------------------
export async function deleteAccountController(req, res){
    const logDetails = getLogContext(req, "AccountService:Delete")
    try{
        const userId = req.user.id;
        const accountId = req.params.accountId;

        //check if account is active
        // await checkResourceStatus(res, accountId, null, userId, 'account');
        const {ok, code, message} = await checkResourceStatus({accountId, cardId:null, userId, flag:'account'});
        if(!ok) {
            logger.warn("Delete aborted:resource status check failed", {...logDetails, error:message});
            return res.status(code).json({success:false, message});}
        const result = await deleteService( accountId, null, userId);
        if(result==='!userId'){
            logger.error("Unauthorized delete attempt", logDetails);
            return res.status(401).json({success:false, error:'Illegal use of API!'});
        }else if(result){
            logger.info('Account deleted Successfully', logDetails);
            return res.status(200).json({success:true, message:'Account deleted successfully!'});
        }
    }catch(err){
        logger.error('Critical error while deleting Account', {...logDetails, error:err.message, stack:err.stack});
        return res.status(500).json({success:false, error:'Something went wrong, please try again later!'});
    }
}


//------------------------------------------ Cards ---------------------------------------------------

//create card and associating with the accountId and userId

export async function saveCardDetailsController(req, res){
    console.log('-----------------Inside savecard----------------');
    const logDetails= getLogContext(req, "CardService:SaveCard");
    
    if(!req.user.id) return res.status(400).json({success:false, error:'User is not logged in'});

    try{
        const {brand, cardnumber, holder_name, expiry_month, expiry_year, type} = req.body;
        const {accountId} = req.params;
        const response = await saveCardDetailsService(accountId, brand, cardnumber, holder_name, expiry_month, expiry_year, req.user.id, type);
        console.log('------------------value of response in save card details-----------------\n', response);
        if(response.error){ 
            logger.error(`Error while saving card details`, {...logDetails, error:response.error.message});
            return res.status(400).json({success:false, error:'Error while saving card details', error:response.error.message});
        }
        logger.info("Card details saved successfully", logDetails);
        return res.status(201).json({success:true, message:`Card details added for user: ${req.user.id}`});
    }catch(err){
        logger.error("Critical error in saveCardDetails", { ...logDetails, error: err.message, stack: err.stack });
        return res.status(500).json({success:false, error:'Something went wrong! please try again later'})
    }
}
// -------------------------------------------------------------------------------------------------

//fetching all cards linked to the userId

export async function fetchAllCardsController(req, res){
    const logDetails = getLogContext(req, "CardService:FetchAll");
    
    if(!req.user.id) return res.status(400).json({success:false, error:'User is not allowed'});
    // const {accountId} = req.params;
    try{
        const result = await fetchAllCardsService(req.user.id);
        console.log('--------------Value of data from fetchAllCaard-------------------:\n', result);
        if(result ==='No data found') {
            logger.info("No cards found for user", logDetails);
            return res.status(404).json({success:false, error:'No data found'});}
        if(result.error){
            logger.error("Service error during fetchAllCards", { ...logDetails, error: result.error });
            return res.status(400).json({success:false, err:result.error});
        }
        // console.log('Value of data from getCardDetails from accountCOntroller:\n---------------', data);
        logger.info("All cards fetched successfully", logDetails);
        return res.status(200).json({success:true, result});


    }catch(err){
         logger.error("Critical error in fetchAllCards", { ...logDetails, error: err.message, stack: err.stack });
        return res.status(500).json({success:false, error:'Something went wrong! please try again later'})
        
    }
}

//fetched card details of single card linked with :accountId

export async function getCardDetailsController(req, res) {
    const logDetails = getLogContext(req, "CardService:FetchOne");
    if(!req.user?.id) return res.status(400).json({success:false, error:'User is not allowed'});

    const userId = req.user.id;
    const {cardId, accountId} = req.params;
    // await checkResourceStatus(res, null, cardId, req.user.id, 'card');
    const {ok, code, message} = await checkResourceStatus({accountId:null, cardId, userId, flag:'card'});
        if(!ok) {
            logger.warn('Resource availability failed', {...logDetails, error:message});
            return res.status(code).json({success:false, error:message});}

    const result = await fetchCardDetailsService(accountId, userId, cardId);
    // console.log('Value of result:', result);

    if(!result){
        logger.warn("Illegal use of API", logDetails);
        return res.status(404).json({success:false, message:'Back off!!', error:'Illegal use of API'});
    }
    
    if(result?.error){
        logger.error("Error while getting card details", {...logDetails, error:result.error});
        return res.status(400).json({success:false, error:result.error});
    }
    logger.info("fetched card details successfully", logDetails);
    return res.status(200).json({success:true, message:'fetched details successfully', data:result});
}


// -----------------------------------------------------------------------------------------------

//deleting card

export async function deleteCardController(req, res){
    const logDetails = getLogContext(req, "CardService:DeleteCard");
    if(!req.user.id) return res.status(400).json({success:false, error:'User is not allowed'});
    const {cardId, accountId} = req.params;
    const userId = req.user.id;

    try{
        // const isCardActive = await isResourceActive(null, cardId, userId);
        // if(!isCardActive || !isCardActive.is_active){
        //     return res.status(404).json({success:false, message:'card not found'})
        // }else if(isCardActive?.error){
        //     return res.status(400).json({success:false, message:'Internal server error'});
        // }

        // await checkResourceStatus(res, accountId, cardId, userId, 'card');

        const {ok, code, message} = await checkResourceStatus({accountId, cardId, userId, flag:'card'});
        if(!ok) {
            logger.warn('Resource is not available', {...logDetails, error:message});
            return res.status(code).json({success:false, message});}

        const result = await deleteService(null,cardId, userId);
        console.log('Value of result from deleteCardsController:',result);
        if(result?.error){
            logger.error('Internal server error', {...logDetails, error:result.error.message});
            return res.status(400).json({success:false, message:'Internal server error!', error:result.error});
        }
        else if(result){
            logger.info('Card deleted successfully', logDetails);
            return res.status(200).json({success:true, message:'Card details successfully deleted'});}
    }catch(err){
        logger.error(`Error while deleting card detail`, {...logDetails, error:err.message});
        return res.status(500).json({success:false, message:'Something went wrong! Please try again later.'});
    }
}
