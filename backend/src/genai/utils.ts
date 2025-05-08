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
