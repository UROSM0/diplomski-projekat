import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { IUsersService } from './Domain/services/IUsersService';
import { UsersService } from './Services/UsersService';
import { UsersController } from './WebAPI/controllers/UsersController';
import { ILogerService } from './Domain/services/ILogerService';
import { LogerService } from './Services/LogerService';
import prisma from './Prisma/client';

dotenv.config({ quiet: true });

const app = express();

// Read CORS settings from environment
const corsOrigin = process.env.CORS_ORIGIN ?? "*";
const corsMethods = process.env.CORS_METHODS?.split(",").map(m => m.trim()) ?? [
  "GET",
  "POST",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

// Protected microservice from unauthorized access
app.use(cors({
  origin: corsOrigin,
  methods: corsMethods,
}));

app.use(express.json());

// Services
const userService: IUsersService = new UsersService(prisma);
const logerService: ILogerService = new LogerService();

// WebAPI routes
const userController = new UsersController(userService, logerService);

// Registering routes
app.use('/api/v1', userController.getRouter());

export default app;
