import { Pool, PoolClient } from "pg";

const makePool = () => {
  const pool = new Pool({
    connectionString: process.env.DB_URL,
  });

  pool.on("error", (err: Error, client: PoolClient) => {
    console.error("Unexpected error on idle client", err);
    process.exit(1);
  });

  return pool;
};

export { makePool };
