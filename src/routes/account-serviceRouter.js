import express from 'express';
import { verifySession } from '../../middleware/verifySession.js';
import { createAccountController, getAccountByUserController, getCardDetailsController, saveCardDetailsController } from '../controllers/accountController.js';
import { logger } from '../../config/logger.js';
// import { logger } from '../../config/logger.js';

const accountRouter = express.Router();
accountRouter.get('/', (req, res)=>{
    logger.info('accountRouter get request hit');
    return res.status(200).send("Welcome to the accountRouter");
});

// /api/v1/accounts/

accountRouter.get('/account-details',  verifySession, getAccountByUserController);
accountRouter.post('/account-details', verifySession, createAccountController);
accountRouter.post('/cards/save-card', verifySession, saveCardDetailsController);
accountRouter.get('/cards/cards-details', verifySession, getCardDetailsController);

// sugggestions:
// GET    /accounts                    (list user’s accounts)
// POST   /accounts                    (create)
// GET    /accounts/:accountId
// PATCH  /accounts/:accountId
// DELETE /accounts/:accountId         (consider soft-delete)
// Cards (nested)

// GET  /accounts/:accountId/cards
// POST /accounts/:accountId/cards   (was /cards/save-card)
// GET  /accounts/:accountId/cards/:cardId
// PATCH/DELETE /accounts/:accountId/cards/:cardId


export default accountRouter;