import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./instruction";
import { MARKDOWN_INSTRUCTIONS } from "./markdown";
import { ToolCard } from "../integrations/types";
import STRIPE_INSTRUCTION from "./stripe_instruction";

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

const stripeGenerationConfig = {
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
  systemInstruction: {
    parts: [{ text: STRIPE_INSTRUCTION }],
  },
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
            text: MARKDOWN_INSTRUCTIONS,
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

  return await ai.models.generateContent(req);
}

export function cleanseLLMResponse(raw: string) {
  if (!raw) {
    throw new Error("No valid response from GenAI");
  }

  const trimmedResponse = raw
    .trim()
    .replace(/^```json\n?/, "")
    .replace(/```$/, "");

  try {
    return JSON.parse(trimmedResponse);
  } catch (err) {
    console.error("Failed to parse cleansed LLM response:", err);
    return null;
  }
}

export async function fetchStripeAPICallFromGenAI(
  userQuery: string,
  selectedTools: ToolCard[]
) {
  const req = {
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Here is the user query: "${userQuery}"`,
          },
          {
            text: `Here are the available tools: \n\n${generateToolText(
              selectedTools
            )}`,
          },
        ],
      },
    ],
    config: stripeGenerationConfig,
  };

  return await ai.models.generateContent(req);
}

const formatToolForLLM = (tool: ToolCard, index: number): string => {
  const params = Object.entries(tool.params)
    .map(
      ([key, { type, required }]) =>
        `  - ${key} (${type}) ${required ? "(required)" : ""}`
    )
    .join("\n");

  return `${index + 1}. Tool Name: ${tool.name}
                        Method: ${tool.method}
                        Path: ${tool.path}
                        Description: ${tool.description}
                        Parameters:
                        ${params}`;
};

const generateToolText = (topTools: ToolCard[]) =>
  topTools.map((tool, i) => formatToolForLLM(tool, i)).join("\n\n");
