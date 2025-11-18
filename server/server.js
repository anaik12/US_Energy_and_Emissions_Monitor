import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import { csvParse } from "d3-dsv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_PROMPT =
  "You are a helpful energy-data co-pilot embedded in a MER/SEDS dashboard. When a user asks for a chart update, confirm that the dashboard view adjusts accordingly (e.g., switch the choropleth to NUETB). When the user asks a broader question that is not satisfied by the provided summary, answer using your general knowledge—just avoid contradicting the summary. Never claim the data is missing if the dashboard could plausibly show it; instead, describe how to inspect the view or, for general analytical questions, provide the best explanation you can.";

const app = express();
const PORT = process.env.PORT || 3001;
const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
const ollamaModel = process.env.OLLAMA_MODEL || "llama3";

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "OPTIONS"]
  })
);
app.use(express.json());

let fullSedsData = null;
let fullSedsLoadError = null;

const fullSedsPath = path.resolve(__dirname, "..", "src", "data", "Complete_SEDS.csv");

async function loadFullSeds() {
  try {
    const file = await readFile(fullSedsPath, "utf8");
    fullSedsData = csvParse(file, (row) => {
      const year = row.Year ? Number(row.Year) : null;
      const state = row.State || row.StateCode || null;
      const msn = row.MSN || row.Code || null;
      const value = row.Data ? Number(row.Data) : Number(row.Value ?? row.Amount);
      if (!year || !state || !msn || value == null || Number.isNaN(value)) return null;
      return {
        year,
        state,
        msn,
        description: row.Description || null,
        unit: row.Unit || row.Units || null,
        value
      };
    }).filter(Boolean);
    console.log(`Loaded ${fullSedsData.length} SEDS rows from ${fullSedsPath}`);
  } catch (error) {
    fullSedsLoadError = error;
    console.error("Failed to load Complete_SEDS.csv", error);
  }
}

loadFullSeds();

app.post("/api/ask", async (req, res) => {
  try {
    const query = (req.body?.query || "").trim();
    if (!query) {
      res.status(400).json({ error: "Query text is required." });
      return;
    }

    const answer = hasOpenAIKey
      ? await runOpenAI(query, process.env.OPENAI_API_KEY, req.body?.contextSummary)
      : await runOllama(query, ollamaUrl, ollamaModel, req.body?.contextSummary);

    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unexpected server error." });
  }
});

app.post("/api/query", async (req, res) => {
  try {
    if (fullSedsLoadError) {
      res.status(500).json({ error: fullSedsLoadError.message });
      return;
    }
    if (!fullSedsData) {
      res.status(503).json({ error: "SEDS dataset is still loading." });
      return;
    }

    const { msn, state, yearStart, yearEnd, groupBy = "state" } = req.body || {};
    if (!msn) {
      res.status(400).json({ error: "Parameter 'msn' is required." });
      return;
    }

    const start = yearStart ? Number(yearStart) : null;
    const end = yearEnd ? Number(yearEnd) : null;

    const filtered = fullSedsData.filter((row) => {
      if (row.msn !== msn) return false;
      if (state && row.state !== state) return false;
      if (start && row.year < start) return false;
      if (end && row.year > end) return false;
      return true;
    });

    const totals = {};
    filtered.forEach((row) => {
      const key = groupBy === "year" ? row.year : row.state;
      if (!totals[key]) {
        totals[key] = 0;
      }
      totals[key] += row.value;
    });

    const results = Object.entries(totals)
      .map(([key, value]) => ({
        key,
        value
      }))
      .sort((a, b) => b.value - a.value);

    res.json({
      count: filtered.length,
      grouping: groupBy,
      msn,
      state: state ?? null,
      yearStart: start,
      yearEnd: end,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Query processing failed." });
  }
});

const distPath = path.resolve(__dirname, "..", "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

async function runOpenAI(query, apiKey, contextSummary) {
  const question = contextSummary
    ? `${contextSummary}\n\nQuestion: ${query}`
    : query;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question }
      ],
      temperature: 0.4,
      max_tokens: 180
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI request failed.");
  }

  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function runOllama(query, baseUrl, model, contextSummary) {
  const question = contextSummary
    ? `${contextSummary}\n\nQuestion: ${query}`
    : query;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Local LLM request failed.");
  }

  const answer = data.message?.content || data?.choices?.[0]?.message?.content;
  if (!answer) {
    throw new Error("Local LLM did not return a message.");
  }
  return answer.trim();
}
