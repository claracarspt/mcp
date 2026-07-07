# Clara Carros MCP server

[![MCP](https://img.shields.io/badge/MCP-server-blue)](https://modelcontextprotocol.io) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

An [MCP](https://modelcontextprotocol.io) server that lets AI assistants work with **[Clara Carros](https://claracars.pt)** — used & imported cars in Portugal. Search live stock, estimate the Portuguese import tax (**ISV**), estimate a car's resale value, and get in touch.

It's a thin, open-source wrapper over the public `claracars.pt` API — no keys, no setup beyond adding the server.

## Tools

| Tool | What it does |
|------|--------------|
| `search_inventory` | Search current stock by make, model, fuel, price, year |
| `get_car` | Full details + specs for one car |
| `calculate_isv` | Estimate Portuguese car import tax (ISV) |
| `calculate_iuc` | Estimate Portuguese annual road tax (IUC) |
| `list_makes_models` | Canonical brand/model names the other tools expect |
| `estimate_resale_value` | Market value range for a car in Portugal |
| `list_services` | What Clara Carros offers |
| `contact_me` | Ask a human to get in touch (needs the user's consent + contact) |
| `request_import_quote` | Ask Clara Carros to source & quote a car to import |

## Use it

### Remote (add a URL)

```
https://claracars.pt/mcp
```

Add it in any client that supports remote/Streamable HTTP MCP servers.

### Local (stdio, via npx)

Claude Desktop / Cline / Continue config:

```json
{
  "mcpServers": {
    "claracars": {
      "command": "npx",
      "args": ["-y", "claracars-mcp"]
    }
  }
}
```

## Examples

- "Find diesel wagons under €20,000 in Clara Carros stock."
- "What's the ISV and annual IUC road tax on a 2016 diesel, 1950 cc, 130 g/km CO₂?"
- "What's my 2018 VW Golf, 100,000 km worth in Portugal?"
- "Ask Clara Carros to source a BMW 320d Touring 2021, my name is … and phone …"

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `CLARACARS_API_BASE` | `https://claracars.pt/api/public` | Public API base |
| `CLARACARS_LANG` | `en` | Response language (pt/en/ru/ua) |
| `PORT` / `MCP_PATH` | `8099` / `/mcp` | HTTP server (remote mode) |

## Develop

```bash
npm install
npm run build
node dist/index.js        # stdio
npm run start:http        # remote HTTP on :8099/mcp
```

## Notes

- **Estimates, not quotes.** ISV and resale figures are estimates; the official ISV is assessed by the Portuguese tax authority.
- **Privacy.** `contact_me` / `request_import_quote` send the details the user provides to Clara Carros ([privacy policy](https://claracars.pt/en/privacy)); they're rate-limited and require explicit user intent.
- No business logic or data lives in this repo — it only calls the public API.

MIT © Clara Carros
