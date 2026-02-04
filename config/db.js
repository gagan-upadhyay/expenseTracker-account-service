import {Pool} from 'pg';
import { logger } from './logger.js';

export const pool = new Pool({
    connectionString:process.env.POSTGRES_URL,
    max:10,
    idleTimeoutMillis:30000,
    connectionTimeoutMillis:20000,
   
});

pool.on('error', (err)=>{
    console.error('Unexpected error on idle client:\n', err);
    logger.error('Unexpected error on idle client:\n', err);
})

export const db = (text, params)=>pool.query(text, params);

export const pgQuery = async(queryText, params=[])=>{
    try{
        console.log('From db, value of queryText and params=[]', queryText, params);
        const result = await pool.query(queryText, params);
        logger.info(`Postgres Query:${queryText}`);
        return result;
    }catch(err){
        logger.error(`Postgres QUERY error:${queryText}`, err);
        throw err;
    }
}

export const pgConnectTest = async()=>{
    try{
        await pool.connect();
        const result = await pool.query(`SELECT NOW()`);
        logger.info(`Postgres connected. Server time:${result.rows[0].now}`)
    }catch(err){
        logger.error('Error connecting postgres:', err);
    }
}
// pgConnectTest();