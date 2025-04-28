import { Request, Response } from "express";
import { AppContext } from "../context";
import {
  fetchMarkdownResponseFromGenAI,
  fetchSQLQueryFromGenAI,
} from "../genai";
export const processQuery =
  (appContext: AppContext) => async (req: Request, res: Response) => {
    const { query: userQuery } = req.body;
    if (!userQuery) {
      res.status(400).json({ error: "query is required in body" });
      return;
    }

    try {
      const preparedDBInfo = JSON.stringify(appContext.schemaInfo, null, 2);
      const genAIQueryResponse = await fetchSQLQueryFromGenAI(
        preparedDBInfo,
        userQuery
      );

      let query = "";
      if (genAIQueryResponse?.candidates) {
        query =
          genAIQueryResponse.candidates[0].content?.parts?.[0]?.text ?? "";
        console.log(query);
      }

      query = query.replace(/```sql/, "").replace(/```/, "");
      // remove ```sql and ``` if present

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
