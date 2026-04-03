// import { error } from "winston";
import { logger } from "../../config/logger.js";
import { checkResourceStatus } from "../helpers/checkResourceStatus.js";
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


//--------------------------------------------------------------------------------------------
export async function createAccountController(req, res) {
    try {
        // console.log("value of req.user.id from controller:\n",req.user.id);
        const userId = req.user.id;
        const {currencyCode, openingBalance, totalIncome, totalExpense, accountType}= req.body;
        const result = await createAccountService(
            req.user.id,
            accountType,
            currencyCode,
            openingBalance,
            totalExpense,
            totalIncome
        );
        
        if(!result){
            logger.error("Unable to fill account table",result);
            return res.status(404).json({success:false, 
                error: "Unable to fill account table, check inputs",   
            });
        }
        logger.info(`User's ${req.user.id} account details are successfully stored`, result);
        
        return res.status(201).json({success:true, message:"User's account details are successfully stored"});

    }catch(err) {
        logger.error(`Error at create Account controller for user ${req.user.id}`, err);
        return res.status(500).json({success:false, error:'Something went wrong! please try again later'})
    }
}
//--------------------------------------------------------------------------------------------

//fetch all the accounts hold by the user using userId

export async function getAccountByUserController(req, res){
    try{
        
        const userExists = await getAccountByUser(req.user.id);
        
        if(!userExists){
            logger.error("user details not found in the accounts table", userExists);
            return res.status(404).json({success:false, error:'user details not found'});
        }
        logger.info("Successfully fetched the details", userExists);
        return res.status(200).json({success:true, message:'Fetched successfully', data:userExists});
    }catch(err){
        logger.error("Error while fetching account details", err);
        return res.status(500).json({success:false, error:'Failed to fetch the accounts details at the moment, please try again later'});
    }
}

//get account details using :accountId

export async function getAccountByIDController(req, res){
    try{
        const accountId = req.params.accountId;

        const userId = req.user.id;
        console.log('Value of accountId:', accountId);
        // await checkResourceStatus(res, accountId, null, userId, 'account')

        const {ok, code, message} = await checkResourceStatus({accountId, cardId:null, userId, flag:'accounts'});
        if(!ok) return res.status(code).json({success:false, error:message});

        const accountDetails = await fetchAccountDetails(userId, accountId);
        if(accountDetails?.error){
            return res.status(400).json({success:false, message:'Unable to get account details', error:error});
        }else if(!accountDetails) return res.status(403).json({success:false, message:'Back off!!', error:'Illegal use of API'})
        return res.status(200).json({success:true, message:'Account deatils fetched successfully!', data:accountDetails});

    }catch(err){
        console.error(`Error while fetching account:${err}`);
        return res.status(500).json({success:false, error:'Something went wrong, please try again later!'});
    }
}
//--------------------------------------------------------------------------------------------

export async function deleteAccountController(req, res){
    try{
        const userId = req.user.id;
        const accountId = req.params.accountId;

        //check if account is active
        // await checkResourceStatus(res, accountId, null, userId, 'account');
        const {ok, code, message} = await checkResourceStatus({accountId, cardId:null, userId, flag:'account'});
        if(!ok) return res.status(code).json({success:false, message});
        const result = await deleteService( accountId, null, userId);
        if(result==='!userId'){
            return res.status(401).json({success:false, error:'Illegal use of API!'});
        }else if(result){
            return res.status(200).json({success:true, message:'Account deleted successfully!'});
        }
    }catch(err){
        console.error(`Error while deleting account:${err}`);
        return res.status(500).json({success:false, error:'Something went wrong, please try again later!'});
    }
}


//------------------------------------------ Cards ---------------------------------------------------

//create card and associating with the accountId and userId

export async function saveCardDetailsController(req, res){
    if(!req.user.id) return res.status(400).json({success:false, error:'User is not logged in'});
    try{

        const {brand, cardNumber, holder_name, expiry_month, expiry_year, is_active} = req.body;
        const {accountId} = req.params;
        const response = await saveCardDetailsService(accountId, brand, cardNumber, holder_name, expiry_month, expiry_year, req.user.id);

        console.log('Value response from saveCardDetails Controller:\n', response);
        console.log('Value of response.error boolean:', Boolean(response.error));
        if(response.error){ 
            logger.error(`Error while saving card details for user: ${req.user.id}`, response.error);
            return res.status(400).json({success:false, error:'Error while saving card details', error:response.error.message});
        }
        return res.status(201).json({success:true, message:`Card details added for user: ${req.user.id}`});



    }catch(err){
        console.error(`Error at saveCardDetails controller for user ${req.user.id}:\n`, err);
        return res.status(500).json({success:false, error:'Something went wrong! please try again later'})
    }
}
// -------------------------------------------------------------------------------------------------

//fetching all cards linked to the userId

export async function fetchAllCardsController(req, res){
    console.log('-----------Inside fetchAllCards----');
    if(!req.user.id) return res.status(400).json({success:false, error:'User is not allowed'});
    // const {accountId} = req.params;
    try{
        const result = await fetchAllCardsService(req.user.id);
        console.log('Value of data from fetchAllCaard:', result);
        if(result ==='No data found') return res.status(404).json({success:false, error:'No data found'});
        if(result.error){
            return res.status(400).json({success:false, err:result.error});
        }
        // console.log('Value of data from getCardDetails from accountCOntroller:\n---------------', data);
        return res.status(200).json({success:true, result});


    }catch(err){
        console.error(`Error at getCardDetails controller for user ${req.user.id}:\n`, err);
        return res.status(500).json({success:false, error:'Something went wrong! please try again later'})
        
    }
}

//fetched card details of single card linked with :accountId

export async function getCardDetailsController(req, res) {
    if(!req.user?.id) return res.status(400).json({success:false, error:'User is not allowed'});

    const userId = req.user.id;
    const {cardId, accountId} = req.params;
    // await checkResourceStatus(res, null, cardId, req.user.id, 'card');
    const {ok, code, message} = await checkResourceStatus({accountId:null, cardId, userId, flag:'card'});
        if(!ok) return res.status(code).json({success:false, error:message});

    const result = await fetchCardDetailsService(accountId, userId, cardId);
    // console.log('Value of result:', result);

    if(!result){
        return res.status(404).json({success:false, message:'Back off!!', error:'Illegal use of API'});
    }
    
    if(result?.error){
        return res.status(400).json({success:false, error:result.error});
    }
    
    return res.status(200).json({success:true, message:'fetched details successfully', data:result});
}


// -----------------------------------------------------------------------------------------------

//deleting card

export async function deleteCardController(req, res){
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
        if(!ok) return res.status(code).json({success:false, message});

        const result = await deleteService(null,cardId, userId);
        console.log('Value of result from deleteCardsController:',result);
        if(result?.error){
            return res.status(400).json({success:false, message:'Internal server error!', error:result.error});
        }
        else if(result) return res.status(200).json({success:true, message:'Card details successfully deleted'});
    }catch(err){
        logger.error(`Error while deleting card details for ${cardId}`);
        return res.status(500).json({success:false, message:'Something went wrong! Please try again later.'});
    }
}



// export async function createAccountAddCardController(req, res){
//     const {account, cards} = req.body();

//     if (!req.user.id) return res.status(400).json({success:false,});
//     const userId = req.user.id;

//     if(!account){


//     }
// }