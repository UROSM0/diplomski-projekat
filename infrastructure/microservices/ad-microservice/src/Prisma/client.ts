import { PrismaClient } from "@prisma/client";

declare global {
  var __adPrisma: PrismaClient | undefined;
}

const prisma = globalThis.__adPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__adPrisma = prisma;
}

export default prisma;
