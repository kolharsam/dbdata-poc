import fs from "fs";

const STRIPE_INSTRUCTION = fs.readFileSync(
  "./src/genai/stripe_promt.md",
  "utf8"
);

export default STRIPE_INSTRUCTION;
