import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import prisma from "./Prisma/client";
import { IChatsService } from "./Domain/services/IChatsService";
import { ILogerService } from "./Domain/services/ILogerService";
import { ChatsService } from "./Services/ChatsService";
import { LogerService } from "./Services/LogerService";
import { ChatsController } from "./WebAPI/controllers/ChatsController";

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

app.use(express.json({ limit: "2mb" }));

const chatsService: IChatsService = new ChatsService(prisma);
const loggerService: ILogerService = new LogerService();
const chatsController = new ChatsController(chatsService, loggerService);

app.use("/api/v1", chatsController.getRouter());

export default app;
