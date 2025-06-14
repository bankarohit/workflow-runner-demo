# Workflow Runner

A mini full-stack workflow runner prototype built with Next.js and TypeScript.

## Run Log Subscriber Component

`RunLogSubscriber` connects to `/api/workflows/{id}/run` via Server-Sent Events and streams log updates. It automatically scrolls to the latest entry and shows connection errors when they occur.

Usage example:

```tsx
<RunLogSubscriber workflowId="demo" />
```
