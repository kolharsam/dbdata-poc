import fs from "fs";
import SwaggerParser from "@apidevtools/swagger-parser";

import { ToolCard } from "./types";

interface ParameterObject {
  name: string;
  in: string;
  required?: boolean;
  schema?: SchemaObject;
  description?: string;
  [key: string]: unknown;
}

type SchemaPropertyType =
  | string
  | number
  | boolean
  | null
  | undefined
  | SchemaObject
  | SchemaObject[];

interface SchemaObject {
  type?: string | string[];
  properties?: Record<string, SchemaObject>;
  required?: string[];
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  format?: string;
  description?: string;
  [key: string]: SchemaPropertyType | SchemaPropertyType[];
}

interface OperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: ParameterObject[];
  requestBody?: {
    content?: Record<
      string,
      {
        schema?: SchemaObject;
      }
    >;
  };
  [key: string]: unknown;
}

interface PathItemObject {
  parameters?: ParameterObject[];
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  delete?: OperationObject;
  patch?: OperationObject;
  [key: string]: unknown;
}

interface OpenAPIDocument {
  paths: Record<string, PathItemObject>;
  [key: string]: unknown;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeType(schema: SchemaObject): string {
  if (!schema) return "string";
  if (Array.isArray(schema.type)) return schema.type[0] || "string";
  return schema.type || "string";
}

export const extractToolCardsFromSpec = async (): Promise<ToolCard[]> => {
  try {
    const specPath = "src/integrations/stripe/spec.json";
    if (!fs.existsSync(specPath)) {
      console.error(`Spec file not found at ${specPath}`);
      return [];
    }

    const api = await SwaggerParser.parse(specPath, {
      resolve: { external: false },
      validate: { schema: false, spec: false },
    });

    const parsedApi = api as unknown as OpenAPIDocument;

    if (!parsedApi.paths) {
      console.warn("No paths found in the OpenAPI specification");
      return [];
    }

    const cards: ToolCard[] = [];

    for (const [path, pathItem] of Object.entries(parsedApi.paths)) {
      if (!pathItem) continue;

      const methods = ["get", "post", "put", "delete", "patch"] as const;
      type HttpMethod = (typeof methods)[number];

      for (const method of methods) {
        const op = pathItem[method] as OperationObject | undefined;
        if (!op) continue;

        interface ParamDefinition {
          type: string;
          required: boolean;
          in?: string;
          minLength?: number;
          maxLength?: number;
          enum?: string[];
          format?: string;
        }

        let params: Record<string, ParamDefinition> = {};

        const allParams = [
          ...(pathItem.parameters || []),
          ...(op.parameters || []),
        ] as ParameterObject[];

        for (const p of allParams) {
          if (!p.name) continue;
          const schema = p.schema || {};
          params[p.name] = {
            type: normalizeType(schema),
            required: !!p.required,
            in: p.in,
            minLength: schema.minLength,
            maxLength: schema.maxLength,
            enum: schema.enum,
            format: schema.format,
          };
        }

        // Support both JSON and form-encoded bodies
        const bodyContent =
          op.requestBody?.content?.["application/json"] ||
          op.requestBody?.content?.["application/x-www-form-urlencoded"];

        const bodySchema = bodyContent?.schema;

        if (bodySchema?.properties) {
          const required = new Set(bodySchema.required || []);
          for (const [name, schema] of Object.entries(bodySchema.properties)) {
            const s = schema as SchemaObject;
            params[name] = {
              type: normalizeType(s),
              required: required.has(name),
              in: "body",
              minLength: s.minLength,
              maxLength: s.maxLength,
              enum: s.enum,
              format: s.format,
            };
          }
        }

        const sortedParams = Object.entries(params).sort(
          ([, a], [, b]) => Number(b.required) - Number(a.required)
        );
        params = Object.fromEntries(sortedParams);

        cards.push({
          name: op.operationId || `${method}_${path.replace(/\//g, "_")}`,
          description: stripHtml(
            op.summary || op.description || "No description available."
          ),
          method: method.toUpperCase(),
          path,
          params,
        });
      }
    }

    console.log(
      `Extracted ${cards.length} tool cards from the Stripe OpenAPI spec.`
    );

    return cards;
  } catch (err) {
    console.error(
      "Error parsing OpenAPI spec:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
};
