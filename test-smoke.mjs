import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({ command: "node", args: ["dist/index.js"] });
const client = new Client({ name: "smoke", version: "1.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("TOOLS:", tools.tools.map((t) => t.name).join(", "));

async function call(name, args) {
  const r = await client.callTool({ name, arguments: args });
  console.log(`\n--- ${name}(${JSON.stringify(args)}) ---`);
  console.log(r.content.map((c) => c.text).join("\n").slice(0, 500));
}

await call("list_services", {});
await call("search_inventory", { fuel: "diesel" });
await call("calculate_isv", { cc: 1950, co2: 130, fuel: "diesel", year: 2016 });
await call("calculate_iuc", { cc: 1950, co2: 130, fuel: "diesel", year: 2016 });
await call("estimate_resale_value", { make: "Volkswagen", model: "Golf", year: 2018, km: 100000, fuel: "petrol" });
await call("get_car", { slug: "mercedes-benz-e-klasse-2016" });
// NOTE: contact_me / request_import_quote intentionally NOT called (would create a real lead).

await client.close();
console.log("\nSMOKE OK");
