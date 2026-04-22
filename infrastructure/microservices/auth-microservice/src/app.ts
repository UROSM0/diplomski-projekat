import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { IAuthService } from './Domain/services/IAuthService';
import { AuthService } from './Services/AuthService';
import { AuthController } from './WebAPI/controllers/AuthController';
import { ILogerService } from './Domain/services/ILogerService';
import { LogerService } from './Services/LogerService';
import prisma from './Prisma/client';

dotenv.config({ quiet: true });

const app = express();

// Read CORS settings from environment
const corsOrigin = process.env.CORS_ORIGIN ?? "*";
const corsMethods = process.env.CORS_METHODS?.split(",").map(m => m.trim()) ?? ["POST"];

// Protected microservice from unauthorized access
app.use(cors({
  origin: corsOrigin,
  methods: corsMethods,
}));

app.use(express.json());

// Services
const authService: IAuthService = new AuthService(prisma);
const logerService: ILogerService = new LogerService();

// WebAPI routes
const authController = new AuthController(authService, logerService);

// Registering routes
app.use('/api/v1', authController.getRouter());

export default app;
