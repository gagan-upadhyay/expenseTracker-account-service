import { logger } from "../../config/logger.js";
import { isResourceActive } from "../service/accountService.js";


export async function checkResourceStatus({accountId=null,cardId=null, userId, flag}){
    try{
        const status = await isResourceActive(accountId, cardId, userId);
        if(status?.error){
            logger.error('isResourceActive error', status.error);
            return {ok:false, code:400, message:'Internal Server error'};
        }
        if(!status || !status.is_active){
            return {ok:false, code:404, message:`${flag} not found`}
        }
        return {ok:true};
    }catch(err){
        logger.error('Error in checkResourceStatus', err);
        return{ok:false, code:500, message:'unexpected error'}
    }
}