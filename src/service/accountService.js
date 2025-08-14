// import { faker } from "@faker-js/faker";
import { db } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import {v4 as uuidv4} from 'uuid';



//fetch bank account details of a user
export async function getAccountByUser(userId){
    console.log("value of userId from service:\n", userId);
    const query = `
    SELECT id, account_type, balance, created_at
    FROM accounts
    WHERE user_id=$1
    ORDER BY created_at DESC
    `;
    const {rows} = await db(query, [userId]);
    console.log("value of rows:\n", rows);
    return rows;
}

export async function createAccountData(userId, accountType, initialBalance=0.0) {
    try{
        console.log("value of userId from service:\n", userId);
        const query = `
        INSERT INTO accounts(id, user_id, account_type, balance)
        VALUES( $1, $2, $3, $4)
        RETURNING id, account_type, balance, created_at
        `;
        const accountId = uuidv4();
        const {rows} = await db(query, [accountId, userId, accountType, initialBalance]);
        console.log("Vlaue of rows form accountservice:\n",rows);
        return rows[0];

    }catch(err){
        logger.error(`Error while inserting data into accounts table for user ${userId}`, err);
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