# Workflow Runner

A mini full-stack workflow runner prototype built with Next.js and TypeScript.

## License and Usage

**Do not copy or paste this code.** All contents of this repository are personal and copyrighted. No copying, use, reproduction, or distribution is permitted without the author's written permission. Unauthorized use may lead to legal action.

## Project Goals

- Demonstrate a tiny workflow engine that executes a prompt step followed by a real OpenAI call.
- Stream logs from the server to the client while the workflow runs.
- Keep the implementation small and easy to understand for experimentation.

## Architecture

### Overview

The server exposes REST endpoints under `/api/workflows` and streams run events from `/api/workflows/{id}/run` using **Server-Sent Events (SSE)**. Workflow specifications and run results are stored in memory via `lib/store.ts`. The `runWorkflow` function executes each node sequentially and retries once if the LLM call times out.

### RunLogSubscriber

`RunLogSubscriber` is a React component that opens an `EventSource` to the run endpoint and displays log lines as they arrive. It automatically scrolls to the latest entry and shows connection errors if the stream fails.

Usage:

```tsx
<RunLogSubscriber workflowId="demo" />
```

### Workflow Spec

`PromptNode` now contains a `template` string and an `input` object. Provide all
prompt variables inside the workflow JSON itself. The UI offers a single text
area where you paste the entire spec and run it.

Example:

```json
{
  "id": "demo",
  "nodes": [
    {
      "id": "p1",
      "type": "PromptNode",
      "template": "Hello {{name}}",
      "input": { "name": "World" }
    },
    { "id": "l1", "type": "LLMNode" }
  ]
}
```

### Key Architectural Decisions

- **SSE vs WebSocket** – SSE keeps the log streaming implementation simple and requires no extra client library.
- **In-memory store** – Workflow definitions and run results are stored in `Map` objects, meaning all data is lost when the server restarts.

### Assumptions and Error Handling

- Workflows must contain exactly two nodes: a `PromptNode` followed by an `LLMNode`; invalid specs return HTTP 400.
- Requesting a nonexistent workflow ID returns HTTP 404.
- `runWorkflow` captures errors, emits them over SSE, and stores the failed run in memory.
- Latest run output is available at `GET /api/workflows/{id}/latest`.

## Setup

### Prerequisites

- Node.js 16+
- npm
Ensure you have **Node.js 16+** and **npm** installed.


### Installation

```bash
npm install
```
Create a `.env.local` file with your OpenAI API key:

```
OPENAI_API_KEY=your-key
```

### Start the development server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.
Paste your workflow JSON into the textarea and click **Run Workflow** to execute
it. Logs for the latest run will appear below the button.

### Running Tests

```bash
npm install
npm test
```

## Security Considerations

This prototype does not implement any authentication or authorization.
Workflow definitions and run results live entirely in the Node.js process
memory, so anyone who can reach the API may submit workflows or read
results. Data will also be lost whenever the server restarts.

## Future Improvements

- Persist workflows and run history to a real database instead of in-memory maps.
- Support WebSocket communication for more interactive scenarios.
- Integrate a real LLM service instead of the current simulated response. (done)

