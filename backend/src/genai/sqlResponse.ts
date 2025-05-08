import { SAFETY_SETTINGS, MODEL, AI } from "./constants";
import { DATABASE_RESPONSE_INSTRUCTION } from "./instructions";

const markdownGenerationConfig = {
  maxOutputTokens: 8192,
  temperature: 1,
  topP: 0.95,
  safetySettings: SAFETY_SETTINGS,
  systemInstruction: {
    parts: [{ text: DATABASE_RESPONSE_INSTRUCTION }],
  },
};

export default async function fetchMarkdownResponseFromGenAI(dbData: string) {
  const req = {
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "This is the given Database Results of a user query(in stringified JSON format): " +
              dbData,
          },
          {
            text: `Based on the the following database results, please provide a concise and efficient markdown response for the following. 
              Please try to tabulate the data in the results provided.`,
          },
        ],
      },
    ],
    config: markdownGenerationConfig,
  };

  return await AI.models.generateContent(req);
}
