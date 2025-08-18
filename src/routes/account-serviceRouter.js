import express from 'express';
import { verifySession } from '../../middleware/verifySession.js';
import { createAccount, getAccountDetailsByUser } from '../controllers/accountController.js';
// import { logger } from '../../config/logger.js';

const accountRouter = express.Router();
// accountRouter.get('/', (req, res)=>{
//     logger.info('accountRouter get request hit');
//     return res.status(200).send("Welcome to the accountRouter");
// });

accountRouter.get('/',  verifySession, getAccountDetailsByUser);
accountRouter.post('/', verifySession, createAccount);


export default accountRouter;