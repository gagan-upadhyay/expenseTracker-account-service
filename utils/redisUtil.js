import { logger } from "../config/logger.js";
import { getRedisClient } from "./redisConnection.js";


const redisClient = await getRedisClient();

export const redisSet = async(key, value, options={})=>{
    try{
        await redisClient.set(key, value, options);
        logger.info(`REDIS SET: ${key}`);
    }catch(err){
        logger.error(`Redis SET error for key ${key}:`, err);
    throw err;
    }
};

export const redisGet = async(key)=>{
    try{
        const value = await redisClient.get(key);
        logger.info(`REDIS GET: ${key}`);
        return value;
    }catch(err){
        logger.error(`REDIS get error for ${key}`, err);
        throw err;
    }
}

export const redisDel = async(key)=>{
    try{
        await redisClient.del(key);
        logger.info(`REDIS Del: ${key}`);
    }catch(err){
        logger.error(`REDIS DEL ERROR for ${key}`, err);
        throw err
    }
}

export const redisExist = async(key)=>{
    try{
        const exists = await redisClient.exists(key);
        if(exists) {logger.info(`Key ${key} exists`); return exists}
        else {logger.info(`Key ${key} doesn't exists`); return null;}
    }catch(err){
        logger.error(`REDIS exist error for key${key}`, err);
        throw err;
    }
}