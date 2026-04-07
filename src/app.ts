import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes';

const app: Application = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/v1', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
