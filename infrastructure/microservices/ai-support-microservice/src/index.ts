import app from "./app";
import prisma from "./Prisma/client";

const port = Number(process.env.PORT) || 5007;

async function start(): Promise<void> {
  await prisma.$connect();
  app.listen(port, () => {
    console.log(`\x1b[32m[AI Support]\x1b[0m localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("AI Support service failed to start:", error);
  process.exit(1);
});
