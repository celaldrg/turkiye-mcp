// End-to-end demo: starts the built server over stdio with the official MCP client SDK,
// lists the tools and calls a few of them. Output is real, nothing is mocked.
//   npm run build && node scripts/demo.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"], stderr: "ignore" });
const client = new Client({ name: "turkiye-mcp-demo", version: "0.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`# ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}\n`);

const calls = process.argv[2] ? JSON.parse(process.argv[2]) : [
  ["convert_currency", { amount: 1000, from: "USD", to: "TRY" }],
  ["get_recent_earthquakes", { min_magnitude: 2.5, hours: 24, limit: 3 }],
  ["check_date", { date: "2026-10-29" }],
  ["add_business_days", { start: "2026-10-27", days: 3 }],
  ["validate_iban", { iban: "TR36 0001 0001 2345 6789 0123 45" }],
  ["amount_to_words", { amount: 1250.5 }],
  ["turkish_text", { text: "istanbul ılık", operation: "upper" }],
  ["get_prayer_times", { province: "Ankara" }],
  ["get_weather", { province: "İzmir", days: 1 }],
];
for (const [name, args] of calls) {
  const res = await client.callTool({ name, arguments: args });
  console.log(`> ${name} ${JSON.stringify(args)}`);
  console.log(res.content.map((c) => c.text).join("\n"));
  console.log();
}
await client.close();
