import express from 'express';
import { verifySession } from '../../middleware/verifySession.js';
import 
{ 
    createAccountController,
    getAccountByUserController, 
    getAccountByIDController, 
    saveCardDetailsController, 
    deleteAccountController,
    deleteCardController,
    fetchAllCardsController,
    getCardDetailsController,
    fetchAllAccounts,
    // updateAccountController,
    adjustAccountBalance
} from '../controllers/accountController.js';
import { logger } from '../../config/logger.js';
// import { logger } from '../../config/logger.js';

const accountRouter = express.Router();
accountRouter.get('/accounts', (req, res)=>{
    logger.info('accountRouter get request hit');
    return res.status(200).send("Welcome to the accountRouter");
});

// /api/v1/accounts/

accountRouter.get('/cards', verifySession, fetchAllCardsController);
accountRouter.get('/:accountId/cards/:cardId', verifySession, getCardDetailsController);
accountRouter.get('/:accountId', verifySession, getAccountByIDController)

accountRouter.get('/',  verifySession, fetchAllAccounts);
accountRouter.post('/', verifySession, createAccountController);


// accountRouter.patch('/:accountId', verifySession, updateAccountController);
accountRouter.delete('/:accountId', verifySession, deleteAccountController)

accountRouter.patch('/:accountId/adjust', verifySession, adjustAccountBalance);


//cards api
accountRouter.post('/:accountId/cards', verifySession, saveCardDetailsController);
accountRouter.delete('/:accountId/cards/:cardId', verifySession, deleteCardController)

// sugggestions:

// PATCH  /accounts/:accountId
// Cards (nested)
// PATCH/DELETE /accounts/:accountId/cards/:cardId


export default accountRouter;