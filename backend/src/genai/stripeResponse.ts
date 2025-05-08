import { ToolCard } from "../integrations/types";
import { AI, MODEL, SAFETY_SETTINGS } from "./constants";
import { STRIPE_INSTRUCTION } from "./instructions";

const stripeGenerationConfig = {
  maxOutputTokens: 8192,
  temperature: 1,
  topP: 0.95,
  safetySettings: SAFETY_SETTINGS,
  systemInstruction: {
    parts: [{ text: STRIPE_INSTRUCTION }],
  },
};

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

export default async function fetchStripeAPICallFromGenAI(
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

  return await AI.models.generateContent(req);
}
