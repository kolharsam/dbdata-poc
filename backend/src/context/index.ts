import { Pool, PoolClient } from "pg";
import { makePool } from "../db";
import { getIntrospectQuery } from "../sql";
import { SchemaInfo } from "./types";

export type AppContext = {
  dbPool: Pool;
  schemaInfo: SchemaInfo;
};

const getSchemaInfo = async (db: PoolClient) => {
  const query = getIntrospectQuery();
  const res = await db.query(query);
  return res.rows;
};

// TODO: the schema info should be updated every 30 seconds and cached

const createAppContext = async (): Promise<AppContext> => {
  const dbPool = makePool();
  const dbInstance = await dbPool.connect();
  const schemaInfo = await getSchemaInfo(dbInstance);

  console.log("Schema info successfully fetched!");
  dbInstance.release();

  return {
    dbPool,
    schemaInfo,
  };
};

export default createAppContext;
