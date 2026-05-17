import { PrismaClient } from "@prisma/client";

declare global {
  var __auditPrisma: PrismaClient | undefined;
}

const prisma = globalThis.__auditPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__auditPrisma = prisma;
}

export default prisma;
