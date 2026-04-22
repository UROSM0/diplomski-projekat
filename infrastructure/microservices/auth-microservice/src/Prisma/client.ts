import { PrismaClient } from "@prisma/client";

declare global {
  var __authPrisma: PrismaClient | undefined;
}

const prisma = globalThis.__authPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__authPrisma = prisma;
}

export default prisma;
