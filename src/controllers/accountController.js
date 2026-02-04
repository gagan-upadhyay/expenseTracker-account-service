
// export async function createAccountstable(req, res){
//     try{
//         const result = await createAccountTablezz();
//         if(result){
//             return res.status(201).json({message:"Accounts table created successfully!"});
//         }
//         return res.status(500).json({message:"issue with creating table, value of result:\n", result});

//     }catch(err){
//         // console.error("Error messagfe from controller:\n", err);
//         return res.status(500).json({error:"Error while creating table", err})
//     }
// }

import { logger } from "../../config/logger.js";
import { createAccount, fetchCardDetailsService, getAccountByUser, saveCardDetailsService} from "../service/accountService.js";

export async function getAccountByUserController(req, res){
    try{
        console.log('Value of req.user.id from getAccoutnDetailsByUser controller:\n',req.user.id);
        const userExists = await getAccountByUser(req.user.id);
        console.log("Value of userExists:\n", userExists);
        

        if(!userExists){
            logger.error("user details not found in the accounts table", userExists);
            return res.status(404).json({message:'user details not found in the accounts table'});
        }
        logger.info("Successfully fetched the details", userExists);
        return res.status(200).json(userExists);
    }catch(err){
        logger.error("Error while fetching account details", err);
        return res.status(500).json({message:'Failed to fetch the accounts details at the moment, please try again later'});
    }
}


{/**
    
    if the user selects account type to be savings, then I will ask for currencyCode,
 openingBalance, 
totalIncome, totalExpense.

otherwise I will ask for, total_credit(Total value of credit card/loan), spent, available_limit(total-spent)
    */}


export async function createAccountController(req, res) {
    try {
        console.log("value of req.user.id from controller:\n",req.user.id);
        const userId = req.user.id;
        const {accountType} = req.body;
        if(accountType==='savings'){
            const {currencyCode, openingBalance, totalIncome, totalExpense}= req.body;
            const result = await createAccount(
                req.user.id,
                currencyCode,
                openingBalance,
                accountType,
                totalIncome,
                totalExpense
            );
        }else{
            const{total_credit, spent} = req.body;
            const result = await createAccount(req.user.id, total_credit, spent);
        }
        if(!result){
            logger.error("Unable to fill account table",result);
            return res.status(404).json({
                message: "Unable to fill account table, check inputs",   
            });
        }
        logger.info(`User's ${req.user.id} account details are successfully stored`, result);
        
        return res.status(201).json({message:"User's account details are successfully stored"});

    }catch(err) {
        logger.error(`Error at create Account controller for user ${req.user.id}`, err);
        return res.status(500).json({message:'Something went wrong! please try again later'})
    }
}


//----------- Cards --------------------
export async function saveCardDetailsController(req, res){
    if(!req.user.id) return res.status(400).json({message:'User is not logged in'});
    try{
        const {account_id, brand, cardNumber, holder_name, expiry_month, expiry_year, is_active} = req.body;
        
        const response = await saveCardDetailsService(account_id, brand, cardNumber, holder_name, expiry_month, expiry_year, is_active, req.user.id);

        console.log('Value response from saveCardDetails Controller:\n', response);
        console.log('Value of response.error boolean:', Boolean(response.error));
        if(response.error){ 
            logger.error(`Error while saving card details for user: ${req.user.id}`, response.error);
            return res.status(400).json({message:'Error while saving card details', error:response.error.message});
        }
        return res.status(201).json({message:`Card details added for user: ${req.user.id}`});



    }catch(err){
        console.error(`Error at saveCardDetails controller for user ${req.user.id}:\n`, err);
        return res.status(500).json({message:'Something went wrong! please try again later'})
    }
}

export async function getCardDetailsController(req, res){
    if(!req.user.id) return res.status(400).json({message:'User is not allowed'});

    try{
        const data = await fetchCardDetailsService(req.user.id);
        if(data ==='No data found') return res.status(404).json({message:'No data found'});
        if(data.error){
            return res.status(400).json({error:data.error});
        }
        console.log('Value of data from getCardDetails from accountCOntroller:\n---------------', data);
        return res.status(200).json(data);


    }catch(err){
        console.error(`Error at getCardDetails controller for user ${req.user.id}:\n`, err);
        return res.status(500).json({message:'Something went wrong! please try again later'})
        
    }
}