import express from 'express';
import { authenticateJWT } from '../../middleware/authenticateJWT.js';
import { createAccount, getAccountDetailsByUser } from '../controllers/accountController.js';
import { logger } from '../../config/logger.js';

const accountRouter = express.Router();
// accountRouter.get('/', (req, res)=>{
//     logger.info('accountRouter get request hit');
//     return res.status(200).send("Welcome to the accountRouter");
// });

accountRouter.get('/', authenticateJWT, getAccountDetailsByUser);
accountRouter.post('/', authenticateJWT, createAccount);


export default accountRouter;