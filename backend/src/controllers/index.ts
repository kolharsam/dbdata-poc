import { Request, Response } from "express";
import { AppContext } from "../context";
import {
  cleanseLLMResponse,
  fetchMarkdownResponseFromGenAI,
  fetchSQLQueryFromGenAI,
  fetchStripeAPICallFromGenAI,
} from "../genai";
import { searchPinecone } from "../integrations";
import { ToolCard } from "../integrations/types";

export const processQuery =
  (appContext: AppContext) => async (req: Request, res: Response) => {
    const { query: userQuery, tool = "database" } = req.body;

    if (!userQuery) {
      res.status(400).json({ error: "query is required in body" });
      return;
    }

    if (tool === "database") {
      runDatabaseTool(appContext, userQuery, res);
    } else if (tool === "stripe") {
      runStripeTool(userQuery, res);
    }
  };

const runDatabaseTool = async (
  appContext: AppContext,
  userQuery: string,
  res: Response
) => {
  try {
    const preparedDBInfo = JSON.stringify(appContext.schemaInfo, null, 2);
    const genAIQueryResponse = await fetchSQLQueryFromGenAI(
      preparedDBInfo,
      userQuery
    );

    let query = "";
    if (genAIQueryResponse?.candidates) {
      query = genAIQueryResponse.candidates[0].content?.parts?.[0]?.text ?? "";
      console.log(query);
    }

    query = query.replace(/```sql/, "").replace(/```/, "");

    if (!query) {
      res
        .status(400)
        .json({ error: "no query generated, error in genAI step" });
      return;
    }

    const db = await appContext.dbPool.connect();
    const result = await db.query(query);
    db.release();

    const markdownResponse = await fetchMarkdownResponseFromGenAI(
      JSON.stringify(result.rows)
    );
    if (markdownResponse?.candidates) {
      res.json({
        response:
          markdownResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
        sqlQuery: query,
      });
    } else {
      res.status(400).json({ error: "no response generated" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "error executing query" });
  }
};

const runStripeTool = async (userQuery: string, res: Response) => {
  const pineconeResult = await searchPinecone(userQuery);

  if (!pineconeResult || !pineconeResult.matches.length) {
    res
      .status(500)
      .json({ error: "failed to fetch relevant tool cards from pinecone" });
    return;
  }

  const selectedTools: ToolCard[] = pineconeResult.matches.map((pr) => ({
    name: pr.metadata?.name as string,
    description: pr.metadata?.description as string,
    method: pr.metadata?.method as string,
    path: pr.metadata?.path as string,
    params: JSON.parse(pr.metadata?.params as string),
  }));

  const genAIQueryResponse = await fetchStripeAPICallFromGenAI(
    userQuery,
    selectedTools
  );

  if (genAIQueryResponse?.candidates) {
    res.json({
      response: cleanseLLMResponse(
        genAIQueryResponse.candidates[0].content?.parts?.[0]?.text ?? ""
      ),
    });
  } else {
    res.status(400).json({ error: "no response generated" });
  }
};
