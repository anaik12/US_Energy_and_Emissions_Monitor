
# US Energy and Emissions Monitor Dashboard – Combined SEDS + MER Variant

Data sources:

- `Complete_SEDS.csv` (SEDS, TETCB) for state-level consumption.
- `Table_1.1_Primary_Energy_Overview.xlsx` (MER Table 1.1) for national totals.

Layout:

- KPIs: combined view (state totals + national change).
- Trend: national primary energy (MER).
- Choropleth & ranking: state consumption (SEDS).
- Sankey-style card: national → states.

## Getting Started

## Prerequisites

- Git
- Node.js (LTS) + npm
- Yarn (`npm install --global yarn`) or use npm scripts
- Text editor (VS Code recommended)
- AI provider setup (pick one):
  - **Ollama (local LLM)** – install Ollama, pull a model (e.g., `ollama pull llama3`), and keep the service running.
  - **OpenAI** – create an API key and note it for `.env`.

## Getting Started

### 1. Download the project

```bash
git clone https://github.com/anaik12/US_Energy_and_Emissions_Monitor.git
cd US_Energy_and_Emissions_Monitor
```

### 2. Install client dependencies

```bash
yarn install    # or npm install
```

### 3. Install server dependencies

```bash
yarn --cwd server install   # equivalent to (cd server && yarn install)
```

### 4. Prepare data

- Ensure `src/data/Complete_SEDS.csv` exists (commit it or drop it in manually).  
- MER national series already lives in `src/data/energyData.js`.

### 5. Configure AI credentials

| Option | Steps |
| --- | --- |
| **Ollama (local LLM)** | Install Ollama, run `ollama pull llama3` (or model of choice), and export:<br>`OLLAMA_URL=http://localhost:11434`<br>`OLLAMA_MODEL=llama3` |
| **OpenAI** | Set `OPENAI_API_KEY` in `.env` or environment before launching the server. |

### 6. Run the project

**Terminal 1 – Client (Vite)**

```bash
yarn dev
```
Visit `http://localhost:5173` in your browser once the dev server starts.

**Terminal 2 – Server (Express proxy)**

```bash
cd server
yarn start
```

The front end talks to the server at `http://localhost:3001/api/query` (SEDS aggregation) and `/api/ask` (AI prompt routing). Keep both processes running during development.
