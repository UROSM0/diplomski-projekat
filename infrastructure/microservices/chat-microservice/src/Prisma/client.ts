import { PrismaClient } from "@prisma/client";

declare global {
  var __chatPrisma: PrismaClient | undefined;
}

const prisma = globalThis.__chatPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__chatPrisma = prisma;
}

export default prisma;
