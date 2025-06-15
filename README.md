# Workflow Runner

A mini full-stack workflow runner prototype built with Next.js and TypeScript.


## Run Log Subscriber Component

`RunLogSubscriber` connects to `/api/workflows/{id}/run` via Server-Sent Events and streams log updates. It automatically scrolls to the latest entry and shows connection errors when they occur.

Usage example:

```tsx
<RunLogSubscriber workflowId="demo" />
```

## Project Goals

- Demonstrate a very small workflow engine that can execute a prompt step and a simulated LLM step.
- Stream logs from the server to the client while the workflow is running.
- Keep the implementation small and easy to understand for experimentation purposes.

## Architecture Overview

The server exposes REST endpoints under `/api/workflows` and streams run
events over **Server-Sent Events (SSE)** from
`/api/workflows/{id}/run`. `RunLogSubscriber` on the client opens an
`EventSource` to this endpoint and updates the log view as events arrive.

Workflow specifications and run results are stored in-memory using `Map`
objects in `lib/store.ts`. The `runWorkflow` function executes nodes in
order and uses `callWithTimeout` to invoke the simulated LLM with a retry
if the first attempt times out.

## Setup

Ensure you have **Node.js 16+** and **npm** installed.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` in your browser.

### Running Tests

Install dependencies and run the Jest suite:

```bash
npm install
npm test
```

## Key Architectural Decisions

- **Server–Sent Events (SSE) vs WebSocket**: The API endpoint at `pages/api/workflows/[id]/run.ts` streams workflow events using SSE. The client listens via `EventSource`. SSE was chosen because it is simple to set up for one-way log streaming and does not require WebSocket handshakes or client libraries.
- **In-memory Store**: Workflow definitions and run results are stored in `Map` objects inside `lib/store.ts`. This keeps the prototype lightweight but means data is lost whenever the server restarts.

## Assumptions and Error Handling

- Workflows must contain exactly two nodes: a `PromptNode` followed by an `LLMNode`. Invalid specs return HTTP 400.
- Requesting a nonexistent workflow ID returns HTTP 404.
- `runWorkflow` captures thrown errors, emits them over SSE, and stores the failed run in memory.

## Security Considerations

This prototype does not implement any authentication or authorization.
Workflow definitions and run results live entirely in the Node.js process
memory, so anyone who can reach the API may submit workflows or read
results. Data will also be lost whenever the server restarts.

## Future Improvements

- Persist workflows and run history to a real database instead of in-memory maps.
- Support WebSocket communication for more interactive use cases.
- Integrate a real LLM service instead of the current simulated response.

