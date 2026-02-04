import {db} from "../../config/db.js";
import { pgQuery } from "../../config/db.js";
/**
 * Create a new account
 * @param {number} userId
 * @param {string} accountType
 * @param {number} balance
 * @returns {Promise<Object>}
 */

export async function create(userId, accountType, balance=0.0){
    const query=`
    INSERT INTO accounts (user_id, account_type, balance)
    VALUES ($1, $2, $3)
    RETURNING id, account_type, balance, created_at
    `;
    const values=[userId, accountType, balance];
    const {rows} = await db(query, values);
    return rows[0];
}

/**
 * Get all accounts for a user
 * @param {number} userId
 * @returns {Promise<Array>}
 */

export async function findByUserId(userId){
    const query=`
    SELECT id, account_type, balance, created_at
    FROM accounts
    WHERE user_id=$1
    ORDER BY created_at DESC
    `;
    const {rows} = await pgQuery(query, [userId]);
    return rows;
}

export async function findById(accountId){
    const query=`
    SELECT user_id, account_type, balance, created_at
    FROM accounts
    WHERE id=$1
    `;
    const {rows} = db(query, [accountId]);
    return rows[0];
}