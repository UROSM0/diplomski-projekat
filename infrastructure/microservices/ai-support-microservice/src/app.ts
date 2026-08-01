import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { IAISupportService } from "./Domain/services/IAISupportService";
import { AISupportService } from "./Services/AISupportService";
import { KnowledgeService } from "./Services/KnowledgeService";
import { AIHistoryService } from "./Services/AIHistoryService";
import prisma from "./Prisma/client";
import { AISupportController } from "./WebAPI/controllers/AISupportController";

dotenv.config({ quiet: true });

const app = express();
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5000";
const corsMethods = process.env.CORS_METHODS?.split(",").map((method) => method.trim()) ?? ["GET", "POST", "OPTIONS"];

app.use(cors({ origin: corsOrigin, methods: corsMethods }));
app.use(express.json({ limit: "64kb" }));

const aiSupportService: IAISupportService = new AISupportService();
const knowledgeService = new KnowledgeService(aiSupportService);
const historyService = new AIHistoryService(prisma);
const aiSupportController = new AISupportController(aiSupportService, knowledgeService, historyService);

app.use("/api/v1", aiSupportController.getRouter());

export default app;
