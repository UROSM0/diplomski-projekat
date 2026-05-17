import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import prisma from "./Prisma/client";
import { ILogerService } from "./Domain/services/ILogerService";
import { ITransactionsService } from "./Domain/services/ITransactionsService";
import { LogerService } from "./Services/LogerService";
import { TransactionsService } from "./Services/TransactionsService";
import { TransactionsController } from "./WebAPI/controllers/TransactionsController";

dotenv.config({ quiet: true });

const app = express();

const corsOrigin = process.env.CORS_ORIGIN ?? "*";
const corsMethods = process.env.CORS_METHODS?.split(",").map((method) => method.trim()) ?? [
  "GET",
  "POST",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

app.use(
  cors({
    origin: corsOrigin,
    methods: corsMethods,
  })
);

app.use(express.json({ limit: "15mb" }));

const transactionsService: ITransactionsService = new TransactionsService(prisma);
const loggerService: ILogerService = new LogerService();
const transactionsController = new TransactionsController(transactionsService, loggerService);

app.use("/api/v1", transactionsController.getRouter());

export default app;
