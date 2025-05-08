import { Pool, PoolClient } from "pg";
import { makePool } from "../db";
import { getIntrospectQuery } from "../sql";
import { SchemaInfo } from "./types";
import { embedToolCards, extractToolCardsFromSpec } from "../integrations";
import { ToolCard } from "../integrations/types";
import { CohereClient } from "cohere-ai";
import { Pinecone } from "@pinecone-database/pinecone";

export type AppContext = {
  dbPool: Pool;
  schemaInfo: SchemaInfo;
  toolCards: ToolCard[];
  cohere: CohereClient;
  pinecone: Pinecone;
};

const INTROSPECTION_SQL = getIntrospectQuery();

const getSchemaInfo = async (db: PoolClient) => {
  return (await db.query(INTROSPECTION_SQL)).rows;
};

// TODO: the schema info should be updated every 30 seconds and cached

const createAppContext = async (): Promise<AppContext> => {
  const dbPool = makePool();
  const dbInstance = await dbPool.connect();
  const schemaInfo = await getSchemaInfo(dbInstance);
  const toolCards = await extractToolCardsFromSpec();
  const cohere = new CohereClient({
    token: process.env.COHERE_API_TOKEN,
  });

  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_TOKEN as string,
  });

  console.log("Schema info successfully fetched!");
  dbInstance.release();

  await embedToolCards(cohere, pinecone, toolCards);

  return {
    dbPool,
    schemaInfo,
    toolCards,
    cohere,
    pinecone,
  };
};

export default createAppContext;
