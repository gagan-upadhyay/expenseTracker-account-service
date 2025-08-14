
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
import { createAccountData, getAccountByUser} from "../service/accountService.js";

export async function getAccountDetailsByUser(req, res){
    try{
        const userExists = await getAccountByUser(req.user.id);

        if(!userExists){
            logger.error("user details not found in the accounts table", userExists);
            return res.status(404).json({message:'user details not found in the accounts table'});
        }
        logger.info("Successfully fetched the details", userExists);
        return res.status(200).json({message:"Successfully fetched the details", userExists});
    }catch(err){
        logger.error("Error while fetching account details", err);
        return res.status(500).json({message:'Failed to fetch the accounts details at the moment, please try again later'});
    }
}

export async function createAccount(req, res) {
    try {
        console.log("value of req.user.id from controller:\n",req.user.id);
        // const userId = req.user.id;
        const {accountType, initialBalance}= req.body;
        const result = await createAccountData(req.user.id, accountType, initialBalance);
        if(!result){
            logger.error("Unable to fill account table",result);
            return res.status(404).json({
                message: "Unable to fill account table, check userId, accountType and initialBalance",
                userId: req.user.id,
                accountType: accountType,
                initialBalance: initialBalance
            });
        }
        logger.info(`User's ${req.user.id} account details are successfully stored`, result);
        return res.status(201).json({message:"User's account details are successfully stored"});

    }catch(err) {
     logger.error(`Error at create Account controller for user`, err);
     return res.status(500).json({message:'Something went wrong! please try again later'})
    }
}