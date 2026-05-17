import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import prisma from "./Prisma/client";
import { IAdsService } from "./Domain/services/IAdsService";
import { ILogerService } from "./Domain/services/ILogerService";
import { AdsService } from "./Services/AdsService";
import { LogerService } from "./Services/LogerService";
import { AdsController } from "./WebAPI/controllers/AdsController";

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

const adsService: IAdsService = new AdsService(prisma);
const loggerService: ILogerService = new LogerService();

const adsController = new AdsController(adsService, loggerService);

app.use("/api/v1", adsController.getRouter());

export default app;
