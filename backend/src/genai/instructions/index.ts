import fs from "fs";
import path from "path";

const DATABASE_QUERY_INSTRUCTION = fs.readFileSync(
  path.join(__dirname, "database-query.md"),
  "utf8"
);

const DATABASE_RESPONSE_INSTRUCTION = fs.readFileSync(
  path.join(__dirname, "database-response.md"),
  "utf8"
);

const STRIPE_INSTRUCTION = fs.readFileSync(
  path.join(__dirname, "stripe-query.md"),
  "utf8"
);

export {
  DATABASE_QUERY_INSTRUCTION,
  DATABASE_RESPONSE_INSTRUCTION,
  STRIPE_INSTRUCTION,
};
