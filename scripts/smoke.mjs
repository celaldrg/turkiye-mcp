// CI smoke test: start the built server over stdio and call one offline tool.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const c = new Client({ name: "ci", version: "0" });
await c.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"], stderr: "ignore" }));
const { tools } = await c.listTools();
if (tools.length < 17) throw new Error(`expected 17 tools, got ${tools.length}`);
const r = await c.callTool({ name: "validate_tckn", arguments: { tckn: "10000000146" } });
if (!JSON.parse(r.content[0].text).valid) throw new Error("unexpected validate_tckn result");
console.log(`stdio OK, ${tools.length} tools`);
await c.close();
