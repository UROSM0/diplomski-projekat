import { PrismaClient } from "@prisma/client";

declare global {
  var __aiSupportPrisma: PrismaClient | undefined;
}

const prisma = globalThis.__aiSupportPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__aiSupportPrisma = prisma;

export default prisma;
