import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = new URL(process.env.URL || "http://127.0.0.1:8099/mcp");
const client = new Client({ name: "smoke-http", version: "1.0" });
await client.connect(new StreamableHTTPClientTransport(url));
const tools = await client.listTools();
console.log("HTTP TOOLS:", tools.tools.map((t) => t.name).join(", "));
const r = await client.callTool({ name: "search_inventory", arguments: {} });
console.log("search_inventory:", r.content.map((c) => c.text).join("").slice(0, 120));
await client.close();
console.log("HTTP SMOKE OK");
