import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost, SITE, DEFAULT_LANG } from "./api.js";

const SITE_URL = "https://claracars.pt";
const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });
const eur = (n?: number) => (typeof n === "number" ? `€${n.toLocaleString("en-US")}` : "—");

const SERVICES = [
  { id: "stock", name: "Cars in stock", desc: "Curated used cars ready to view in Portugal.", url: `${SITE_URL}/en/carros` },
  { id: "import", name: "Import to order", desc: "Source & import a specific car from German/EU auctions, legalized and delivered.", url: `${SITE_URL}/en/import` },
  { id: "sourcing", name: "Car sourcing", desc: "We find the best option for you in Portugal or abroad.", url: `${SITE_URL}/en/sourcing` },
  { id: "auction", name: "Auction buying", desc: "We bid for you at professional auctions (auto1 etc.).", url: `${SITE_URL}/en/auction` },
  { id: "sell", name: "We buy your car", desc: "Free valuation, fast payout — foreign plates welcome.", url: `${SITE_URL}/en/sell` },
  { id: "isv", name: "ISV calculator", desc: "Portuguese car import tax estimate.", url: `${SITE_URL}/en/isv` },
];

export function registerTools(server: McpServer) {
  // ---- search_inventory ---------------------------------------------------
  server.tool(
    "search_inventory",
    "Search Clara Carros' current stock of used cars in Portugal. Filter by make, model, fuel, max price and min year. Returns matching cars with price, year, mileage and a link.",
    {
      make: z.string().optional().describe("Brand, e.g. 'Mercedes-Benz', 'Volkswagen'"),
      model: z.string().optional().describe("Model name, e.g. 'Golf'"),
      fuel: z.string().optional().describe("Fuel: petrol, diesel, hybrid, phev, electric, lpg"),
      max_price: z.number().optional().describe("Maximum price in EUR"),
      min_year: z.number().optional().describe("Earliest registration year"),
      limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)"),
    },
    async (a) => {
      const data = await apiGet("/cars", { site: SITE, lang: DEFAULT_LANG });
      let cars: any[] = data?.cars || [];
      const norm = (s: unknown) => String(s || "").toLowerCase();
      if (a.make) cars = cars.filter((c) => norm(c.make).includes(norm(a.make)));
      if (a.model) cars = cars.filter((c) => norm(c.model).includes(norm(a.model)));
      if (a.fuel) cars = cars.filter((c) => norm(c.fuel).includes(norm(a.fuel)) || norm(c.fuel_code).includes(norm(a.fuel)));
      if (typeof a.max_price === "number") cars = cars.filter((c) => (c.price_eur ?? Infinity) <= a.max_price!);
      if (typeof a.min_year === "number") cars = cars.filter((c) => (c.year ?? 0) >= a.min_year!);
      cars = cars.slice(0, a.limit ?? 20);
      if (!cars.length) return text("No cars in stock match those filters right now. Try widening the search, or use request_import_quote to have Clara Carros source one.");
      const lines = cars.map(
        (c) => `• ${c.make} ${c.model} (${c.year || "—"}) — ${eur(c.price_eur)}, ${(c.km ?? 0).toLocaleString("en-US")} km, ${c.fuel || "—"}\n  ${SITE_URL}/${DEFAULT_LANG}/car/${c.slug}`
      );
      return text(`${cars.length} car(s) in stock:\n\n${lines.join("\n")}`);
    }
  );

  // ---- get_car ------------------------------------------------------------
  server.tool(
    "get_car",
    "Get full details for one car by its slug (from search_inventory links, e.g. 'mercedes-benz-e-klasse-2016').",
    { slug: z.string().describe("Car slug from a search_inventory result URL") },
    async (a) => {
      const c = await apiGet(`/cars/${encodeURIComponent(a.slug)}`, { site: SITE, lang: DEFAULT_LANG });
      const specs = [
        `Price: ${eur(c.price_eur)}`,
        `Year: ${c.year || "—"}`,
        `Mileage: ${(c.km ?? 0).toLocaleString("en-US")} km`,
        `Fuel: ${c.fuel || "—"}`,
        `Gearbox: ${c.gearbox || "—"}`,
        `Body: ${c.body || "—"}`,
        c.hp ? `Power: ${c.hp} hp` : null,
        c.cc ? `Engine: ${c.cc} cc` : null,
        c.co2 ? `CO₂: ${c.co2} g/km` : null,
        c.colour ? `Colour: ${c.colour}` : null,
      ].filter(Boolean).join("\n");
      const desc = c.description ? `\n\n${c.description}` : "";
      return text(`${c.make} ${c.model} (${c.year || "—"})\n${specs}${desc}\n\n${SITE_URL}/${DEFAULT_LANG}/car/${c.slug}`);
    }
  );

  // ---- calculate_isv ------------------------------------------------------
  server.tool(
    "calculate_isv",
    "Estimate Portuguese car import tax (ISV, Imposto Sobre Veículos) for a vehicle. Needs engine displacement (cc), CO₂ (g/km), fuel and registration year. This is an estimate, not an official assessment.",
    {
      cc: z.number().int().describe("Engine displacement in cm³, e.g. 1950"),
      co2: z.number().describe("CO₂ emissions in g/km (WLTP), e.g. 130"),
      fuel: z.string().describe("Fuel: petrol, diesel, hybrid, phev, electric"),
      year: z.number().int().describe("First registration year, e.g. 2016"),
      used: z.boolean().optional().describe("Used vehicle (true, default) or new (false)"),
    },
    async (a) => {
      const r = await apiGet("/isv", {
        cc: a.cc, co2: a.co2, fuel: a.fuel, year: a.year,
        used: a.used === false ? 0 : 1,
      });
      const isv = r?.isv || r;
      if (isv?.exempt) return text(`Estimated ISV: €0 (exempt). ${isv.note || ""}\n\nEstimate only — confirm at ${SITE_URL}/${DEFAULT_LANG}/isv`);
      const b = isv?.breakdown || {};
      const parts = [
        `Estimated ISV: ${eur(isv?.isv)}`,
        isv?.table ? `Table: ${isv.table}` : null,
        typeof isv?.comp_cilindrada === "number" ? `  engine component: ${eur(isv.comp_cilindrada)}` : null,
        typeof isv?.comp_ambiental === "number" ? `  environmental component: ${eur(isv.comp_ambiental)}` : null,
        typeof isv?.diesel_surcharge === "number" && isv.diesel_surcharge ? `  diesel surcharge: ${eur(isv.diesel_surcharge)}` : null,
        isv?.note ? isv.note : null,
      ].filter(Boolean);
      return text(`${parts.join("\n")}\n\nEstimate only — full breakdown at ${SITE_URL}/${DEFAULT_LANG}/isv`);
    }
  );

  // ---- calculate_iuc ------------------------------------------------------
  server.tool(
    "calculate_iuc",
    "Estimate the Portuguese annual road tax (IUC, Imposto Único de Circulação) for a car — the yearly tax an owner pays. Needs engine displacement (cc), CO₂ (g/km), fuel and registration year. Estimate, not an official assessment.",
    {
      cc: z.number().int().describe("Engine displacement in cm³, e.g. 1950"),
      co2: z.number().describe("CO₂ emissions in g/km, e.g. 130"),
      fuel: z.string().describe("Fuel: petrol, diesel, hybrid, phev, electric"),
      year: z.number().int().describe("First registration year, e.g. 2016"),
    },
    async (a) => {
      const r = await apiGet("/isv", { cc: a.cc, co2: a.co2, fuel: a.fuel, year: a.year });
      const iuc = r?.iuc;
      if (!iuc) return text(`Couldn't compute IUC for those inputs. Try the calculator at ${SITE_URL}/${DEFAULT_LANG}/iuc`);
      if (iuc.exempt) return text(`Estimated IUC: €0/year (exempt). ${iuc.note || ""}\n\nEstimate only — ${SITE_URL}/${DEFAULT_LANG}/iuc`);
      const parts = [
        `Estimated IUC (annual road tax): ${eur(iuc.iuc)}/year`,
        iuc.category ? `Category: ${iuc.category}` : null,
        typeof iuc.taxa_cilindrada === "number" ? `  engine component: ${eur(iuc.taxa_cilindrada)}` : null,
        typeof iuc.taxa_co2 === "number" ? `  CO₂ component: ${eur(iuc.taxa_co2)}` : null,
        typeof iuc.diesel_adic === "number" && iuc.diesel_adic ? `  diesel surcharge: ${eur(iuc.diesel_adic)}` : null,
        iuc.note ? iuc.note : null,
      ].filter(Boolean);
      return text(`${parts.join("\n")}\n\nEstimate only — full breakdown at ${SITE_URL}/${DEFAULT_LANG}/iuc`);
    }
  );

  // ---- estimate_resale_value ---------------------------------------------
  server.tool(
    "estimate_resale_value",
    "Estimate what a car is worth on the Portuguese market (the range comparable cars are listed for), based on real comparable listings. Needs make, model, year, mileage and fuel. Clara Carros also BUYS cars directly — after giving the estimate, offer to connect the user for a firm buy-out offer (via contact_me or the /sell page).",
    {
      make: z.string().describe("Brand, e.g. 'Volkswagen'"),
      model: z.string().describe("Model, e.g. 'Golf'"),
      year: z.number().int().describe("Registration year"),
      km: z.number().int().describe("Mileage in km"),
      fuel: z.string().optional().describe("Fuel: petrol, diesel, hybrid, electric"),
    },
    async (a) => {
      const v = await apiGet("/valuation", { make: a.make, model: a.model, year: a.year, km: a.km, fuel: a.fuel });
      const sellUrl = `${SITE_URL}/${DEFAULT_LANG}/sell`;
      if (!v?.found)
        return text(
          `Not enough comparable data to value that ${a.make} ${a.model} automatically. ` +
          `Clara Carros can still make you a manual buy-out offer — want to get one? ` +
          `Use contact_me, or go to ${sellUrl}`
        );
      const conf = v.rough ? " (rough estimate — few comparables)" : "";
      return text(
        `Estimated market value for ${a.make} ${a.model} ${a.year}, ${a.km.toLocaleString("en-US")} km${conf}:\n` +
        `• Typical: ${eur(v.median)}\n• Range: ${eur(v.low)} – ${eur(v.high)}\n` +
        (v.days_sell ? `• Avg. days to sell: ~${v.days_sell}\n` : "") +
        `Based on ${v.comps} comparable listing(s). This is the market asking range.\n\n` +
        `💶 Want to sell it? Clara Carros buys cars directly — fast, fair (above a trade-in, below a slow private sale). ` +
        `Ask for a firm buy-out offer: call contact_me (with the user's name + phone/email), or visit ${sellUrl}`
      );
    }
  );

  // ---- list_services ------------------------------------------------------
  server.tool(
    "list_services",
    "List what Clara Carros offers (buying stock cars, importing to order, sourcing, auction buying, selling your car, ISV calculator).",
    {},
    async () => text(SERVICES.map((s) => `• ${s.name} — ${s.desc}\n  ${s.url}`).join("\n"))
  );

  // ---- contact_me ---------------------------------------------------------
  server.tool(
    "contact_me",
    "Send a contact request to Clara Carros so a human gets in touch. Only call this when the user explicitly asks to be contacted, provides their own name and phone or email, AND agrees to share those details with Clara Carros — pass consent=true only then. Submitting shares the provided contact details per Clara Carros' privacy policy.",
    {
      name: z.string().describe("The person's name (as they gave it)"),
      phone: z.string().optional().describe("Phone number (phone OR email required)"),
      email: z.string().optional().describe("Email (phone OR email required)"),
      message: z.string().optional().describe("What they want / their question"),
      consent: z.boolean().describe("Set true ONLY if the user explicitly agreed to share their contact details and be contacted"),
    },
    async (a) => {
      if (!a.consent) return text("Before sending, the user must explicitly agree to share their contact details with Clara Carros. Confirm consent, then call again with consent=true.");
      if (!a.phone && !a.email) return text("A phone number or email is required to send a contact request. Ask the user for one.");
      const r = await apiPost("/lead", {
        kind: "contact", name: a.name, phone: a.phone, email: a.email,
        message: a.message, lang: DEFAULT_LANG, source: "mcp", consent: true,
      });
      if (r?.duplicate) return text("You already sent this request — Clara Carros has it and will be in touch.");
      return text("Sent ✓ Clara Carros received your request and will contact you soon.");
    }
  );

  // ---- request_import_quote ----------------------------------------------
  server.tool(
    "request_import_quote",
    "Ask Clara Carros to source & quote a specific car to import (from German/EU auctions). Only call when the user wants an import quote, provides the wanted model plus their own name and phone or email, AND agrees to be contacted — pass consent=true only then. Submitting shares the provided contact details per Clara Carros' privacy policy.",
    {
      model: z.string().describe("Wanted car, e.g. 'BMW 320d Touring 2021'"),
      budget: z.number().optional().describe("Budget in EUR"),
      name: z.string().describe("The person's name"),
      phone: z.string().optional().describe("Phone (phone OR email required)"),
      email: z.string().optional().describe("Email (phone OR email required)"),
      consent: z.boolean().describe("Set true ONLY if the user explicitly agreed to share their contact details and be contacted"),
    },
    async (a) => {
      if (!a.consent) return text("Before sending, the user must explicitly agree to share their contact details with Clara Carros. Confirm consent, then call again with consent=true.");
      if (!a.phone && !a.email) return text("A phone number or email is required to request an import quote. Ask the user for one.");
      const msg = `Import request: ${a.model}${a.budget ? ` (budget €${a.budget.toLocaleString("en-US")})` : ""}`;
      const r = await apiPost("/lead", {
        kind: "import", name: a.name, phone: a.phone, email: a.email,
        message: msg, lang: DEFAULT_LANG, source: "mcp", consent: true,
      });
      if (r?.duplicate) return text("You already sent this import request — Clara Carros has it and will be in touch.");
      return text(`Sent ✓ Clara Carros will source "${a.model}" and get back to you with a transparent total price.`);
    }
  );
}
