import express, { Request, Response } from "express";
import cors from "cors";

import createAppContext from "./context";
import { processQuery } from "./controllers";

import "dotenv/config";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const port = process.env.PORT || 3000;

(async () => {
  const appContext = await createAppContext();

  app.get("/healthz", (req: Request, res: Response) => {
    res.status(200).send("OK");
  });

  app.post("/query", processQuery(appContext));

  app.listen(port, () => {
    console.log(`Server listening on port ${port} 🚀`);
  });
})();
