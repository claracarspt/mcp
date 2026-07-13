# Cline installation guide

This file tells an AI assistant (e.g. Cline) how to install the **Clara Carros MCP
server** for the user. No API keys, no accounts, no build step are required.

There are two ways to add it. Prefer the **remote** option — it needs no local
runtime. Fall back to the **local (npx)** option if the client does not support
remote/Streamable-HTTP MCP servers.

## Option A — Remote (recommended)

Add a remote MCP server pointing at:

```
https://claracars.pt/mcp
```

Transport: `streamable-http`. No headers, no authentication.

If the client uses a JSON config with a `url` field, add:

```json
{
  "mcpServers": {
    "claracars": {
      "url": "https://claracars.pt/mcp"
    }
  }
}
```

## Option B — Local (stdio, via npx)

Runs the published npm package `claracars-mcp` over stdio. Requires Node.js ≥ 18.

Add to the MCP servers config:

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

## Optional environment variables

None are required. Defaults work out of the box.

| Env var | Default | Purpose |
|---------|---------|---------|
| `CLARACARS_API_BASE` | `https://claracars.pt/api/public` | Public API base |
| `CLARACARS_LANG` | `en` | Response language (`pt` / `en` / `ru` / `ua`) |

## Verify the install

After adding the server, confirm these **9 tools** are listed:

`search_inventory`, `get_car`, `calculate_isv`, `calculate_iuc`,
`list_makes_models`, `estimate_resale_value`, `list_services`,
`contact_me`, `request_import_quote`.

Then run one query to confirm it responds, e.g.:

> "What's the ISV and annual IUC on a 2016 diesel, 1950 cc, 130 g/km CO₂ in Portugal?"

A successful answer means setup is complete.

## Notes

- Thin, open-source (MIT) wrapper over the public `claracars.pt` API — it holds no
  secrets and no business data; it only calls the public endpoints.
- `contact_me` and `request_import_quote` send the details the user explicitly
  provides to Clara Carros ([privacy policy](https://claracars.pt/en/privacy)); they
  are rate-limited and require explicit user intent.
- ISV / IUC / resale figures are **estimates**, not official assessments.
