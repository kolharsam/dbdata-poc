import { Pool, PoolClient } from "pg";
import { makePool } from "../db";
import { getIntrospectQuery } from "../sql";
import { SchemaInfo } from "./types";
import { embedToolCards, extractToolCardsFromSpec } from "../integrations";
import { ToolCard } from "../integrations/types";

export type AppContext = {
  dbPool: Pool;
  schemaInfo: SchemaInfo;
  toolCards: ToolCard[];
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
  const toolCards = await extractToolCardsFromSpec();

  console.log("Schema info successfully fetched!");
  dbInstance.release();

  await embedToolCards(toolCards);

  return {
    dbPool,
    schemaInfo,
    toolCards,
  };
};

export default createAppContext;
