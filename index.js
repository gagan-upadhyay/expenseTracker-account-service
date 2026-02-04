import express from 'express';
import '@dotenvx/dotenvx/config';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { logger } from './config/logger.js';
import cors from 'cors';
import morgan from 'morgan';
import accountRouter from './src/routes/account-serviceRouter.js';
import { setupHealthCheckUp } from './utils/setupHealthCheckup.js';
import { getRedisClient } from './utils/redisConnection.js';

import setupGracefulShutDown from './utils/setupGracefulShutdown.js';
import { pool } from './config/db.js';


const app = express();

const corsOptions={
    origin:['http://localhost:3000', 'https://expense-tracker-self-rho-12.vercel.app/', 'http://192.168.0.126:3000'],
    credentials:true
};
// const corsOptions = {
//   origin: function (origin, callback) {
//     const allowedOrigins = [
//       'http://localhost:3000', 'https://expense-tracker-6afeksr0j-gagans-projects-00cb1a77.vercel.app', , 'http://172.168.0.148:3000','https://expense-tracker-self-rho-12.vercel.app'
//     ];
//     const ipRegex = /^http:\/\/192\.168\.0\.\d{1,3}:3000$/;
//     if (!origin || allowedOrigins.includes(origin) || ipRegex.test(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true
// };
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(compression());
app.use(express.json());


if(process.env.NODE_ENV==='development'){
    app.use(morgan('dev'));
}

//midddleware
//application level error catcher:
app.use((err, req, res, next)=>{
    console.error("Error at application level:\n",err.stack);
    logger.error("Caught application level error:\n", err);
    res.status(500).json({message:"Something went wrong! try again later."});
    next();
});


app.get('/', (req, res)=>{
    logger.info("Welcome route of Account-service hit!");
    return res.status(200).send("Welcome to the account-service");
})

// app routes

app.use('/api/v1/accounts', accountRouter);

setupHealthCheckUp(app);


const server = app.listen(process.env.PORT, ()=>{
    console.log(`Account-service running at port ${process.env.PORT}`);
    logger.info(`Account-service running at port ${process.env.PORT}`);
});

setupGracefulShutDown(server, [
    async ()=>await getRedisClient.disconnect(),
    async()=>await pool.end(),
]);

export default app;