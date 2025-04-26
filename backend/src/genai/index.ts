import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./instruction";

const ai = new GoogleGenAI({
  vertexai: true,
  project: "directed-racer-439422-p4",
  location: "us-central1",
});
const MODEL = "gemini-2.0-flash-001" as const;

// Set up generation config
const generationConfig = {
  maxOutputTokens: 8192,
  temperature: 1,
  topP: 0.95,
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.OFF,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.OFF,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.OFF,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.OFF,
    },
  ],
  systemInstruction: {
    parts: [{ text: SYSTEM_INSTRUCTION }],
  },
};

const markdownGenerationConfig = {
  maxOutputTokens: 8192,
  temperature: 1,
  topP: 0.95,
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.OFF,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.OFF,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.OFF,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.OFF,
    },
  ],
  responseModalities: ["TEXT"],
};

export async function fetchSQLQueryFromGenAI(
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

  return await ai.models.generateContent(req);
}

export async function fetchMarkdownResponseFromGenAI(dbData: string) {
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
            text: `Based on the the following database results, please provide a concise and efficient markdown response for the following. Please try to tabulate the data in the results provided.`,
          },
        ],
      },
    ],
    config: markdownGenerationConfig,
  };

  return await ai.models.generateContent(req);
}
