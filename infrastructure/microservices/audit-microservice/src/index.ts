console.clear();
import app from "./app";
import prisma from "./Prisma/client";

const port = process.env.PORT || 5006;

async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("\x1b[34m[DbConn@2.0]\x1b[0m Prisma connected");

    app.listen(port, () => {
      console.log(`\x1b[32m[TCPListen@2.1]\x1b[0m localhost:${port}`);
    });
  } catch (error) {
    console.error("\x1b[31m[DbConn@2.0]\x1b[0m Prisma connection failed", error);
    process.exit(1);
  }
}

void bootstrap();
