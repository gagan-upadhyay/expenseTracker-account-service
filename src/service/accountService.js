// import { faker } from "@faker-js/faker";
import {  pgQuery } from "../../config/db.js";
import { logger } from "../../config/logger.js";
// import {v4 as uuidv4} from 'uuid';



//fetch bank account details of a user
export async function getAccountByUser(userId){
    if(!userId){
        logger.warn('getAccountByUser called without userId');
        return null;
    }
    const query = `
    SELECT 
    id,
    account_type,
    currency_code,
    opening_balance,
    total_income,
    total_expense,
    remaining_balance

    FROM accounts
    WHERE user_id=$1 AND is_active=TRUE
    ORDER BY created_at DESC
    `;
    try{
        const {rows} = await pgQuery(query, [userId]);
        console.log('Value of rows:', rows);
        return rows;
    }catch(err){
        logger.error(`Error while fetching account for user ${userId}`, err);
        throw err;
    }
    // const user = await db(query, [userId]);
    // console.log("value of rows:\n", user);
    // return user.rows[0];
}

export async function createAccountService(userId, accountType, currencyCode, openingBalance, totalExpense, totalIncome) {
    if(!userId){
        logger.warn('createAccountData called without userId');
        return null;
    }
    console.log(userId, accountType, currencyCode, openingBalance, totalExpense, totalIncome);

    try{
        const query = `
        INSERT INTO accounts (user_id, account_type, currency_code, opening_balance, total_expense, total_income)
        VALUES( $1, $2, $3, $4, $5, $6)
        RETURNING id, account_type, currency_code, opening_balance, total_expense, total_income
        `;
        const {rows} = await pgQuery(query, [userId, accountType, currencyCode, openingBalance, totalExpense, totalIncome]);
        return rows[0];

    }catch(err){
        logger.error(`Error while inserting data into accounts table for user ${userId}`, err);
        throw err;
    }
}

export async function isResourceActive(accountId, cardId, userId){
    console.log('-------------Inside isResourceActive----------');
    const service = accountId?'accounts':'cards';
    try{
        const query=`
        SELECT is_active FROM ${service} WHERE id=$1 AND user_id=$2
        `
        console.log('Value of query:', query);
        const {rows} = await pgQuery(query, [accountId?accountId:cardId, userId]);
        return rows[0];
    }catch(err){
        logger.error(`Error while fetching ${accountId?accountId:cardId} details: ${err}`);
        return {error:err}
    }
}

export async function deleteService(accountId, cardId, userId) {
    try{
        const service = accountId?'accounts':'cards';
        //soft deleting
        const query=`
        UPDATE ${service}
        SET deleted_at=NOW(), is_active=FALSE
        WHERE id=$1 AND user_id=$2
        RETURNING id
        `
        const {rows}= await pgQuery(query, [accountId?accountId:cardId, userId]);
        console.log('Value of query:\n', query);
        console.log("value of rows:\n", rows);
        return rows[0];

    }catch(err){
        logger.error('Error while deleting account:', err);
        return {error:err};
    }

}

export async function fetchAccountDetails(userId,accountId){
    if(!userId) return false;
    try{
        const query=`
        SELECT currency_code, opening_balance, total_income, total_expense, remaining_balance
        FROM accounts
        WHERE id=$1 AND user_id=$2
        `
        const {rows} = await pgQuery(query, [accountId, userId]);
        return rows[0];
    }catch(err){
        logger.error(`Error while fetching account details of ${accountId}: ${err}`);
        return {error:err}
    }
}

// export async function updateAccountService(){
//     if(!userId){
//         logger.warn('userId is required');
//         return '!userId';
//     }
//     try{
//         const query=`
         
//         `

//     }catch(err){
//         logger.info(`Error while deleting ${accountId}: ${err}`);
//         return {error:err}
//     }
// }


//--------------Card Services--------------------------

//need to match the userId and accountId
export async function saveCardDetailsService(account_id, brand, cardNumber, holder_name, expiry_month, expiry_year, userId){
    if(!userId){
        logger.warn('saveCardDetailsService called without userId');
        return null;
    }
    try{
        const query =`
        INSERT INTO cards (user_id, account_id, brand, cardnumber, holder_name, expiry_month, expiry_year)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        
        RETURNING *;
        `
        const {rows} = await pg(query, 
            [
                userId,
                account_id, 
                brand, 
                cardNumber, 
                holder_name, 
                expiry_month, 
                expiry_year, 
            ]
        )

        return rows[0];

    }catch(err){
        logger.error(`Error while saving Card details in db with userId: ${userId}:\n`, err);
        return {error:err};

    }

}

export async function fetchAllCardsService(userId){
    if(!userId){
        logger.warn('fetchCardDetailsService called without userId');
        return null;
    }
    console.log('Value of userId from fetchAllcards Service:', userId);
    try{
        const query = `
        SELECT 
        *
        FROM cards WHERE user_id=$1 AND is_active=TRUE
        `;
        const {rows} = await pgQuery(query, [userId]);
        if(rows.length===0) return 'No data found';
        return rows;
    }catch(err){
        logger.error(`Error while fetching All Card details of ${userId}:\n`, err);
        return {error:err};

    }
}

export async function fetchCardDetailsService(accountId, userId, cardId) {
    if(!userId){
        logger.warn('fetchCardDetailsService called without userId');
        return null;
    }
    try{
        const query=`
        SELECT 
        brand,
        cardnumber,
        holder_name,
        expiry_month,
        expiry_year
        FROM cards
        WHERE 
        id=$1 AND account_id=$2 AND is_active=TRUE
        `;
        const {rows} = await pgQuery(query, [cardId, accountId]);
        console.log('Value of rows:', rows);
        return rows[0];
    }catch(err){
        logger.error(`Error while fetching card ${cardId} user:${userId}: ${err}`);
        return {error:err};
    }
}

