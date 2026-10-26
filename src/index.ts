#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, VERSION } from "./server.js";

if (process.argv.includes("--version") || process.argv.includes("-v")) {
  console.log(VERSION);
  process.exit(0);
}

const server = createServer();
await server.connect(new StdioServerTransport());
console.error(`turkiye-mcp ${VERSION} running on stdio`);
