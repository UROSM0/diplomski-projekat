const { Client } = require("../../user-microservice/node_modules/pg");

async function main() {
  const client = new Client({ connectionString: "postgresql://postgres:postgres@localhost:5432/postgres" });
  await client.connect();
  const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", ["ai_support_db"]);
  if (result.rowCount === 0) await client.query("CREATE DATABASE ai_support_db");
  await client.end();
  console.log("ai_support_db ready");
}

main().catch((error) => { console.error(error.message); process.exit(1); });
