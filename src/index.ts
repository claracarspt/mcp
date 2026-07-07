#!/usr/bin/env node
// Clara Carros MCP server — stdio transport (for `npx claracars-mcp`, Claude Desktop, Cline, etc.)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

const server = new McpServer({ name: "claracars", version: "0.1.0" });
registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
// stderr only — stdout is the MCP channel
console.error("claracars-mcp running on stdio");
