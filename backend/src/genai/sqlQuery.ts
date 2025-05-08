import { SAFETY_SETTINGS, MODEL, AI } from "./constants";
import { DATABASE_QUERY_INSTRUCTION } from "./instructions";

const generationConfig = {
  maxOutputTokens: 8192,
  temperature: 1,
  topP: 0.95,
  safetySettings: SAFETY_SETTINGS,
  systemInstruction: {
    parts: [{ text: DATABASE_QUERY_INSTRUCTION }],
  },
};

export default async function fetchSQLQueryFromGenAI(
  userDBInfo: string,
  userQuery: string
) {
  const req = {
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "This is the given Database schema of the user(in stringified JSON format): " +
              userDBInfo,
          },
          {
            text:
              `Based on the the following user query and the provided database schema information of the user database, 
              could you please provide a precise, concise and efficient SQL query for the following: ` +
              userQuery,
          },
          {
            text: `Please provide the response in plain text without any markdown formatting`,
          },
        ],
      },
    ],
    config: generationConfig,
  };

  return await AI.models.generateContent(req);
}
