// import { faker } from "@faker-js/faker";
import { db, pgQuery } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import {v4 as uuidv4} from 'uuid';



//fetch bank account details of a user
export async function getAccountByUser(userId){
    if(!userId){
        logger.warn('getAccountByUser called without userId');
        return null;
    }
    const query = `
    SELECT 
    
    account_type, 
    opening_balance,
    total_income, 
    total_expense, 
    currency_code, 
    is_active
    
    FROM accounts
    WHERE user_id=$1
    ORDER BY created_at DESC
    `;
    try{
        const result = await pgQuery(query, [userId]);
        // console.log('BValue of result after pgQuery:\n', result);
        const {rows} = await db(query, [userId]);
        // console.log('Value of rows[0]:\n', rows[0])
        return rows.length ? rows[0] : null;
    }catch(err){
        logger.error(`Error while fetching account for user ${userId}`, err);
        throw err;
    }
    // const user = await db(query, [userId]);
    // console.log("value of rows:\n", user);
    // return user.rows[0];
}

export async function createAccount(userId, accountType, currencyCode, openingBalance, totalIncome, totalExpense) {
    if(!userId){
        logger.warn('createAccountData called without userId');
        return null;
    }

    try{
        const query = `
        INSERT INTO accounts (id, user_id, account_type, currency_code, opening_balance, total_expense, total_income)
        VALUES( $1, $2, $3, $4, $5, $6, $7)
        RETURNING id, account_type, currency_code, opening_balance, total_expense, total_income, created_at
        `;
        const accountId = uuidv4();
        const {rows} = await db(query, [accountId, userId, accountType, currencyCode, openingBalance, totalExpense, totalIncome]);
        return rows[0];

    }catch(err){
        logger.error(`Error while inserting data into accounts table for user ${userId}`, err);
        throw err;
    }
}

export async function saveCardDetailsService(account_id, brand, cardNumber, holder_name, expiry_month, expiry_year, is_active, userId){
    if(!userId){
        logger.warn('saveCardDetailsService called without userId');
        return null;
    }
    try{
        const query =`
        INSERT INTO cards (id, user_id, account_id, brand, cardnumber, holder_name, expiry_month, expiry_year, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
        `
        const id=uuidv4();
        console.log('Value of id.........................................................................:\n', id);

        const {rows} = await db(query, 
            [
                id,
                userId,
                account_id, 
                brand, 
                cardNumber, 
                holder_name, 
                expiry_month, 
                expiry_year, 
                is_active
            ]
        )

        return rows[0];

    }catch(err){
        logger.error(`Error while saving Card details in db with userId: ${userId}:\n`, err);
        return {error:err};

    }

}

export async function fetchCardDetailsService(userId){
    if(!userId){
        logger.warn('fetchCardDetailsService called without userId');
        return null;
    }
    try{
        const query = `
        SELECT 
        
        brand,
        cardnumber,
        holder_name,
        expiry_month,
        expiry_year,
        is_active
        FROM cards WHERE user_id=$1
        `;
        const {rows} = await db(query, [userId]);
        if(rows.length===0) return 'No data found';
        return rows[0];
    }catch(err){
        logger.error(`Error while saving Card details in db with userId: ${userId}:\n`, err);
        return {error:err};

    }
}

// export async function createAccountTablezz(){
//     try{ 
//         const result = await pool.query(`
//         CREATE TABLE accounts(
//         id PRIMARY KEY,                  //     id UUID PRIMARY KEY DEFAULT gen_random_uuid,
//         user_id uuid REFERENCES users(id),
//         account_type VARCHAR(50),
//         balance NUMERIC(12, 2) DEFAULT 0.0,
//         created_at TIMESTAMP DEFAULT NOW()
//         )
//         `);
//         // const result = await pool.query(quer);
//         console.log("value of result from accountservice\n:", result);
//         return result;
//     }catch(err){
//         console.error(err);
//         return res.status(500).send(err);
//     }
// }