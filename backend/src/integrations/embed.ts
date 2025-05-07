import fs from "fs";
import { CohereClient } from "cohere-ai";
import {
  Pinecone,
  ScoredPineconeRecord,
  RecordMetadata,
} from "@pinecone-database/pinecone";
import { ToolCard } from "./types";

const COHERE_API_KEY = fs.readFileSync(
  "src/integrations/tokens/cohere",
  "utf8"
);
const PINECONE_API_KEY = fs.readFileSync(
  "src/integrations/tokens/pinecone",
  "utf8"
);

const cohere = new CohereClient({
  token: COHERE_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

const INDEX_NAME = "dbdata-embeddings";

// Initialize Pinecone index
const initPineconeIndex = async () => {
  try {
    const indexList = await pinecone.listIndexes();

    if (!indexList.indexes?.find((index) => index.name === INDEX_NAME)) {
      console.log(`Creating index ${INDEX_NAME}...`);
      await pinecone.createIndex({
        name: INDEX_NAME,
        metric: "cosine",
        dimension: 1024,
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
      });
      console.log("Index created successfully");
    }

    return pinecone.index(INDEX_NAME);
  } catch (error) {
    console.error("Failed to initialize Pinecone index:", error);
    throw error;
  }
};

let pineconeIndex: ReturnType<typeof pinecone.index>;

// Initialize the index before use
const getPineconeIndex = async () => {
  if (!pineconeIndex) {
    pineconeIndex = await initPineconeIndex();
  }
  return pineconeIndex;
};

const formTextFromToolCard = (card: ToolCard): string => {
  const paramText = Object.entries(card.params)
    .map(([name, meta]) => {
      const constraintParts = [];
      if (meta.required) constraintParts.push("required");
      if (meta.minLength !== undefined)
        constraintParts.push(`minLength: ${meta.minLength}`);
      if (meta.maxLength !== undefined)
        constraintParts.push(`maxLength: ${meta.maxLength}`);
      if (meta.enum) constraintParts.push(`enum: [${meta.enum.join(", ")}]`);
      if (meta.format) constraintParts.push(`format: ${meta.format}`);

      return `${name} (${meta.type}${
        constraintParts.length ? `, ${constraintParts.join(", ")}` : ""
      })`;
    })
    .join("; ");

  return `${card.description}. Method: ${card.method}. Path: ${card.path}. Params: ${paramText}`;
};

const fetchEmbeddingForUserQuery = async (query: string): Promise<number[]> => {
  const embeddingResponse = await cohere.embed({
    texts: [query],
    inputType: "search_query",
    model: "embed-english-v3.0",
  });

  if (!embeddingResponse.embeddings) {
    throw new Error("No embeddings found");
  }

  const embeddings = embeddingResponse.embeddings as number[][];
  return embeddings[0];
};

const COHERE_TEXT_LIMIT = 96; // Maximum number of texts per api call

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

export const embedToolCards = async (toolCards: ToolCard[]) => {
  const cohereIndex = await getPineconeIndex();
  const batches = chunkArray(toolCards, COHERE_TEXT_LIMIT);

  for (const batch of batches) {
    const texts = batch.map(formTextFromToolCard);

    const embeddingResponse = await cohere.embed({
      texts,
      inputType: "search_document",
      model: "embed-english-v3.0",
    });

    const embeddingsList = embeddingResponse.embeddings as number[][];

    const pineconeVectors = batch.map((tool, i) => ({
      id: tool.name,
      values: embeddingsList[i],
      metadata: {
        name: tool.name,
        description: tool.description,
        method: tool.method,
        path: tool.path,
        params: JSON.stringify(tool.params),
      },
    }));

    await cohereIndex.upsert(pineconeVectors);

    console.log(`Upserted ${pineconeVectors.length} tool cards.`);
  }
  console.log("Done storing tool cards in DB");
};

export const searchPinecone = async (query: string) => {
  const index = await getPineconeIndex();
  const queryEmbedding = await fetchEmbeddingForUserQuery(query);

  const results = await index.query({
    topK: 10,
    vector: queryEmbedding,
    includeMetadata: true,
  });

  if (!results.matches) {
    // TODO: Handle this case - no matches found
    return results;
  }

  const remappedResults = remapRankingForPineconeResults(results.matches);

  console.log(
    remappedResults.map((r) => ({
      path: (r.metadata as any).path,
      score: r.score,
      adjustedScore: (r as any).adjustedScore,
    }))
  );

  return remappedResults;
};
const computeStructuralScore = (path: string): number => {
  const pathDepth = path.split("/").filter(Boolean).length;
  const numPathParams = (path.match(/\{[^}]+\}/g) || []).length;
  const paramPenalty = numPathParams <= 1 ? 1 : 0.5;
  const depthPenalty = 1 / pathDepth;

  return paramPenalty * depthPenalty * 0.5; // max 0.5
};

const remapRankingForPineconeResults = (
  results: ScoredPineconeRecord<RecordMetadata>[],
  confidenceThreshold: number = 0.66
) => {
  if (!results.length) return results;

  return results
    .map((res, i) => {
      const path = (res?.metadata?.path as string) || "";
      const score = res.score ?? 0;

      const protectTop = i === 0 && score >= confidenceThreshold;
      const structuralScore = computeStructuralScore(path);

      const adjustedScore = protectTop
        ? score
        : 0.85 * score + 0.15 * structuralScore;

      return {
        ...res,
        adjustedScore,
      };
    })
    .sort((a, b) => (b.adjustedScore ?? 0) - (a.adjustedScore ?? 0));
};
