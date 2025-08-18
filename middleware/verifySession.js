import jwt from 'jsonwebtoken';
import { redisClient } from '../utils/redisConnection.js';

export const verifySession = async(req, res, next)=>{
    try{
        console.log("From verify session");
        const token = req.cookies.accessToken;
        console.log("Value of tokemn from verifySession:", token);
        if(!token) return res.status(401).json({message:'Token missing'});
        const decoded = jwt.verify(token, process.env.SECRET);
        
        const cachedToken = await redisClient.get(`session:${decoded.id}`);
        if(cachedToken!== token){
            return res.status(401).json({message:'Invalid or expired token'})
        }
        req.user=decoded;
        next();
    }catch(err){
        res.status(401).json({message:'Unauthorized!'});
    }
};