import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

const AI = new GoogleGenAI({
  vertexai: true,
  project: "directed-racer-439422-p4",
  location: "us-central1",
});

const MODEL = "gemini-2.0-flash-001" as const;

const SAFETY_SETTINGS = [
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
];

export { AI, MODEL, SAFETY_SETTINGS };
