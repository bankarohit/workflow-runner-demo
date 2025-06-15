# Workflow Runner

A mini full-stack workflow runner prototype built with Next.js and TypeScript.

## Project Goals

- Demonstrate a tiny workflow engine that executes a prompt step followed by a simulated LLM step.
- Stream logs from the server to the client while the workflow runs.
- Keep the implementation small and easy to understand for experimentation.

## Architecture

### Overview

The server exposes REST endpoints under `/api/workflows` and streams run events from `/api/workflows/{id}/run` using **Server-Sent Events (SSE)**.
Workflow specifications and run results are stored in-memory via `lib/store.ts`.
The `runWorkflow` function executes each node sequentially and calls the LLM step with `callWithTimeout`, retrying once on timeout.

### RunLogSubscriber

`RunLogSubscriber` is a React component that opens an `EventSource` to the run endpoint and displays log lines as they arrive. It automatically scrolls to the latest entry and shows connection errors if the stream fails.

Usage:

```tsx
<RunLogSubscriber workflowId="demo" />
```

### Key Architectural Decisions

- **SSE vs WebSocket** – SSE keeps the log streaming implementation simple and requires no extra client library.
- **In-memory store** – Workflow definitions and run results are stored in `Map` objects, meaning all data is lost when the server restarts.

### Assumptions and Error Handling

- Workflows must contain exactly two nodes: a `PromptNode` followed by an `LLMNode`; invalid specs return HTTP 400.
- Requesting a nonexistent workflow ID returns HTTP 404.
- `runWorkflow` captures errors, emits them over SSE, and stores the failed run in memory.

## Setup

### Prerequisites

- Node.js 16+
- npm

### Installation

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Running Tests

```bash
npm install
npm test
```

## Security Considerations

This prototype implements no authentication. Workflow definitions and run results reside entirely in process memory, so anyone who can reach the API may submit or read workflows. All data is lost on server restart.

## Future Improvements

- Persist workflows and run history to a real database instead of in-memory maps.
- Support WebSocket communication for more interactive scenarios.
- Integrate a real LLM service instead of the current simulated response.
