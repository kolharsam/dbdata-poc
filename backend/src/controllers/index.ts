import { Request, Response } from "express";
import { AppContext } from "../context";
import {
  fetchMarkdownResponseFromGenAI,
  fetchSQLQueryFromGenAI,
  fetchStripeAPICallFromGenAI,
} from "../genai";
import { searchPinecone } from "../integrations";
import { ToolCard } from "../integrations/types";
import { SchemaInfo } from "../context/types";
import { PoolClient } from "pg";
import { cleanseLLMResponse } from "../genai/utils";
import { Pinecone } from "@pinecone-database/pinecone";
import { CohereClient } from "cohere-ai";
import { constructStripeAPICall } from "./utils";
import { GenAIStripeAPICallResponse } from "./utils";

export const processQuery =
  (appContext: AppContext) => async (req: Request, res: Response) => {
    const { query: userQuery, tool = "database" } = req.body;

    if (!userQuery) {
      res.status(400).json({ error: "query is required in body" });
      return;
    }

    const { cohere, pinecone, dbPool, schemaInfo } = appContext;

    switch (tool) {
      case "database": {
        const dbConn = await dbPool.connect();
        const result = await runDatabaseTool(dbConn, schemaInfo, userQuery);

        if ("error" in result) {
          res.status(400).json({ error: result.error });
          return;
        }

        res.json(result);
        return;
      }
      case "stripe": {
        const result = await runStripeTool(cohere, pinecone, userQuery);
        res.json(result);
        return;
      }
      default:
        res.status(400).json({ error: "invalid tool" });
        return;
    }
  };

const runDatabaseTool = async (
  dbConn: PoolClient,
  schemaInfo: SchemaInfo,
  userQuery: string
) => {
  try {
    const preparedDBInfo = JSON.stringify(schemaInfo, null, 2);

    const genAIQueryResponse = await fetchSQLQueryFromGenAI(
      preparedDBInfo,
      userQuery
    );

    let query = "";
    if (genAIQueryResponse?.candidates) {
      query = genAIQueryResponse.candidates[0].content?.parts?.[0]?.text ?? "";
    }

    if (!query) {
      return {
        error: "no query generated, error in genAI step",
      };
    }

    query = query.replace(/```sql/, "").replace(/```/, "");

    if (!query) {
      return {
        error: "no query generated, error in genAI step",
      };
    }

    const result = await dbConn.query(query);
    dbConn.release();

    const markdownResponse = await fetchMarkdownResponseFromGenAI(
      JSON.stringify(result.rows)
    );

    if (!markdownResponse?.candidates) {
      return {
        error: "no response generated",
      };
    }

    return {
      type: "database",
      response:
        markdownResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      sqlQuery: query,
    };
  } catch (error) {
    console.error(error);
    return {
      error: "error executing query",
    };
  }
};

const runStripeTool = async (
  cohere: CohereClient,
  pinecone: Pinecone,
  userQuery: string
) => {
  const pineconeResult = await searchPinecone(pinecone, cohere, userQuery);

  if (
    !pineconeResult ||
    (Array.isArray(pineconeResult) && !pineconeResult.length)
  ) {
    return {
      error: "failed to fetch relevant tool cards from pinecone",
    };
  }

  const selectedTools: ToolCard[] = (
    Array.isArray(pineconeResult) ? pineconeResult : pineconeResult.matches
  ).map((pr) => ({
    name: pr.metadata?.name as string,
    description: pr.metadata?.description as string,
    method: pr.metadata?.method as string,
    path: pr.metadata?.path as string,
    params: JSON.parse(pr.metadata?.params as string),
  }));

  // console.log(
  //   selectedTools.map((t) => ({
  //     name: t.name,
  //     description: t.description,
  //     method: t.method,
  //     path: t.path,
  //   }))
  // );

  const genAIQueryResponse = await fetchStripeAPICallFromGenAI(
    userQuery,
    selectedTools
  );

  if (!genAIQueryResponse?.candidates) {
    return {
      error: "no response generated",
    };
  }

  const cleanedResponse = cleanseLLMResponse(
    genAIQueryResponse.candidates[0].content?.parts?.[0]?.text ?? ""
  ) as GenAIStripeAPICallResponse;

  if (cleanedResponse.status !== "incomplete") {
    return {
      response: cleanedResponse.reason,
      type: "stripe",
    };
  }

  const apiCallResponse = await constructStripeAPICall(cleanedResponse);

  return {
    response: apiCallResponse,
    type: "stripe",
  };
};
