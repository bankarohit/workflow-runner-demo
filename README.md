# Workflow Runner

A mini full-stack workflow runner prototype built with Next.js and TypeScript.

## Project Goals

- Demonstrate a very small workflow engine that can execute a prompt step and a simulated LLM step.
- Stream logs from the server to the client while the workflow is running.
- Keep the implementation small and easy to understand for experimentation purposes.

## Setup

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

Run the test suite with:

```bash
npm test
```
Ensure that project dependencies have been installed before running the tests:

```bash
npm install
```

The repository currently contains no actual test scripts and the `package.json` file is only a placeholder, so this command will fail until tests are implemented.

## Key Architectural Decisions

- **Server–Sent Events (SSE) vs WebSocket**: The API endpoint at `pages/api/workflows/[id]/run.ts` streams workflow events using SSE. The client listens via `EventSource`. SSE was chosen because it is simple to set up for one-way log streaming and does not require WebSocket handshakes or client libraries.
- **In-memory Store**: Workflow definitions and run results are stored in `Map` objects inside `lib/store.ts`. This keeps the prototype lightweight but means data is lost whenever the server restarts.

## Assumptions and Error Handling

- Workflows must contain exactly two nodes: a `PromptNode` followed by an `LLMNode`. Invalid specs return HTTP 400.
- Requesting a nonexistent workflow ID returns HTTP 404.
- `runWorkflow` captures thrown errors, emits them over SSE, and stores the failed run in memory.

## Future Improvements

- Persist workflows and run history to a real database instead of in-memory maps.
- Support WebSocket communication for more interactive use cases.
- Integrate a real LLM service instead of the current simulated response.
- Provide a complete `package.json`, implement automated tests, and ensure `npm test` succeeds.
