import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import prisma from "./Prisma/client";
import { IAuditService } from "./Domain/services/IAuditService";
import { AuditService } from "./Services/AuditService";
import { AuditController } from "./WebAPI/controllers/AuditController";

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

app.use(cors({ origin: corsOrigin, methods: corsMethods }));
app.use(express.json({ limit: "2mb" }));

const auditService: IAuditService = new AuditService(prisma);
const auditController = new AuditController(auditService);

app.use("/api/v1", auditController.getRouter());

export default app;
