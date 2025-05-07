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
import fs from "fs";
import path from "path";

const STRIPE_API_KEY = fs.readFileSync(
  path.join(__dirname, "../integrations/tokens/stripe"),
  "utf8"
);

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
        type: "database",
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

  if (
    !pineconeResult ||
    (Array.isArray(pineconeResult) && !pineconeResult.length)
  ) {
    res
      .status(500)
      .json({ error: "failed to fetch relevant tool cards from pinecone" });
    return;
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

  console.log(
    selectedTools.map((t) => ({
      name: t.name,
      description: t.description,
      method: t.method,
      path: t.path,
    }))
  );

  const genAIQueryResponse = await fetchStripeAPICallFromGenAI(
    userQuery,
    selectedTools
  );

  if (genAIQueryResponse?.candidates) {
    const cleanedResponse = cleanseLLMResponse(
      genAIQueryResponse.candidates[0].content?.parts?.[0]?.text ?? ""
    ) as GenAIStripeAPICallResponse;

    if (cleanedResponse.status === "complete") {
      const apiCallResponse = await constructStripeAPICall(cleanedResponse);
      res.json({
        response: apiCallResponse,
        type: "stripe",
      });
    } else {
      res.json({
        response: cleanedResponse.reason,
        type: "stripe",
      });
    }
  } else {
    res.status(400).json({ error: "no response generated" });
  }
};

type GenAIStripeAPICallResponse = {
  status: "incomplete" | "complete";
  reason?: string;
  missing?: string[];
  tool?: string;
  request?: {
    method: "GET" | "POST" | "DELETE";
    url: string;
    headers: Record<string, string>;
    queryParams: Record<string, string>;
    body: Record<string, string>;
  };
};

const constructStripeAPICall = async (response: GenAIStripeAPICallResponse) => {
  if (!response.request) {
    throw new Error("No request found in response");
  }

  const { method, url, queryParams, body } = response.request;

  const formBody = new URLSearchParams(body).toString();

  const isBodyMethod = method.toUpperCase() === "POST";
  const isDeleteWithBody =
    method.toUpperCase() === "DELETE" && body && Object.keys(body).length > 0;

  const requestOptions: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_API_KEY}`,
      ...(isBodyMethod || isDeleteWithBody
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    ...(isBodyMethod || isDeleteWithBody
      ? { body: new URLSearchParams(body).toString() }
      : {}),
  };

  const fullUrl =
    method === "GET" && queryParams
      ? `${url}?${new URLSearchParams(queryParams).toString()}`
      : url;

  const res = await fetch(fullUrl, requestOptions);

  return await res.json();
};
