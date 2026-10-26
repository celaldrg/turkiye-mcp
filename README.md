# turkiye-mcp 🇹🇷

**Give your AI agent Türkiye-specific knowledge it can't guess: official TCMB exchange rates, live earthquakes, the real holiday calendar, business-day math, IBAN/TCKN/VKN checks, provinces & districts, prayer times, weather and correct Turkish text handling.**

An [MCP](https://modelcontextprotocol.io) server for Claude Desktop, Cursor, VS Code and any other MCP client. **No API keys, no sign-up**: every tool uses free public data or runs fully offline.

[![CI](https://github.com/celaldrg/turkiye-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/celaldrg/turkiye-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-339933)
![17 tools](https://img.shields.io/badge/tools-17-orange)

> LLMs routinely get these wrong: "What is the USD/TRY rate the central bank published today?", "Is 28 October a working day?", "Which bank is this IBAN?", "`istanbul`.toUpperCase()" (it's **İSTANBUL**, not ISTANBUL). This server gives them the right answer, with the source.

## Why this one

- **Zero config.** No keys, no accounts, no env vars. 12 of 17 tools work offline.
- **Official sources.** Rates from TCMB, earthquakes from AFAD and Kandilli, religious holiday dates from Diyanet's own published tables (not an approximate Hijri calculation).
- **Business-day aware.** Knows half-day eves (arife), 3-day Ramazan and 4-day Kurban Bayramı, so deadlines like "10 business days from today" come out right.
- **English-first, Turkish-correct.** English tool descriptions and output for global agents, with correct Turkish casing, district names and "yazıyla" amounts.
- **Tested.** Unit tests on real captured data plus a weekly live check against every upstream API.

## Install

> **Note:** the npm package is not published yet. Until it is, `npx` installs straight from this GitHub repo (`github:celaldrg/turkiye-mcp`). After the npm release the arg becomes just `turkiye-mcp`.

Requires Node.js 20 or newer.

### Claude Desktop

Add to `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "turkiye": {
      "command": "npx",
      "args": ["-y", "github:celaldrg/turkiye-mcp"]
    }
  }
}
```

### Cursor

[Add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=turkiye&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImdpdGh1YjpjZWxhbGRyZy90dXJraXllLW1jcCJdfQ==) (one click), or add to `~/.cursor/mcp.json` / `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "turkiye": { "command": "npx", "args": ["-y", "github:celaldrg/turkiye-mcp"] }
  }
}
```

### VS Code (Copilot agent mode)

```bash
code --add-mcp '{"name":"turkiye","command":"npx","args":["-y","github:celaldrg/turkiye-mcp"]}'
```

or `.vscode/mcp.json`:

```json
{
  "servers": {
    "turkiye": { "type": "stdio", "command": "npx", "args": ["-y", "github:celaldrg/turkiye-mcp"] }
  }
}
```

### Claude Code

```bash
claude mcp add turkiye -- npx -y github:celaldrg/turkiye-mcp
```

### From source

```bash
git clone https://github.com/celaldrg/turkiye-mcp && cd turkiye-mcp
npm install && npm run build
node dist/index.js   # speaks MCP over stdio
```

## Tools

| Tool | What it does | Source | Offline |
|---|---|---|:---:|
| `get_exchange_rates` | Official TCMB rates (forex/banknote buy/sell), latest or any date since 1996; weekends fall back to the previous bulletin | [TCMB](https://www.tcmb.gov.tr/kurlar/today.xml) | |
| `convert_currency` | Convert between TRY and ~22 currencies (or cross rates) at TCMB rates for a date | TCMB | |
| `get_recent_earthquakes` | Latest earthquakes, filter by hours, magnitude, province; UTC and Türkiye time | [AFAD](https://deprem.afad.gov.tr), [Kandilli](http://www.koeri.boun.edu.tr/scripts/lst0.asp) | |
| `get_public_holidays` | All official holidays for 2024-2035 incl. Ramazan/Kurban Bayramı and half-day eves | Law 2429 + [Diyanet tables](https://vakithesaplama.diyanet.gov.tr) | ✅ |
| `check_date` | Is a date a weekend, holiday, half day or business day? | same | ✅ |
| `add_business_days` | Date ± N Turkish business days | same | ✅ |
| `count_business_days` | Business days between two dates | same | ✅ |
| `list_provinces` | 81 provinces with plate codes | [turkey-neighbourhoods](https://github.com/muratgozel/turkey-neighbourhoods) (MIT) | ✅ |
| `get_province` | Province by name (any casing/diacritics) or plate, with its districts | same | ✅ |
| `find_district` | Which province(s) a district belongs to (e.g. Gölbaşı → Ankara, Adıyaman) | same | ✅ |
| `validate_tckn` | T.C. Kimlik No checksum | algorithm | ✅ |
| `validate_vkn` | Vergi Kimlik No checksum (10-digit; 11-digit checked as TCKN) | algorithm | ✅ |
| `validate_iban` | Turkish IBAN mod-97 check + bank name | TCMB EFT participant list | ✅ |
| `get_prayer_times` | Imsak, güneş, öğle, ikindi, akşam, yatsı for a province/district | [Aladhan](https://aladhan.com/prayer-times-api) (Diyanet method) | |
| `get_weather` | Current weather + up to 7-day forecast for a province/district | [Open-Meteo](https://open-meteo.com) | |
| `turkish_text` | Turkish-correct upper/lower/title case, ASCII transliteration, slugs | built-in | ✅ |
| `amount_to_words` | Amount in Turkish words for invoices/cheques ("yazıyla") | built-in | ✅ |

All tools are read-only. Validators never send the numbers anywhere.

## Example prompts

- "How much is 2,500 EUR in lira at today's TCMB selling rate? And what was it on 1 January 2025?"
- "Were there any earthquakes above magnitude 4 in Türkiye in the last 48 hours? Which provinces?"
- "Our invoice is due 15 business days after 20 May 2026. What's the date in Türkiye?"
- "Which days are holidays in 2027, and which ones make a long weekend?"
- "Check this IBAN and tell me the bank: TR36 0001 0001 2345 6789 0123 45"
- "Write 18.750,40 TL in words for the invoice."
- "What time is iftar (akşam) in Kadıköy, İstanbul tomorrow?"
- "Convert this list of city names to proper Turkish uppercase for the shipping labels."

## Demo

Real output from `node scripts/demo.mjs` (MCP client SDK → this server over stdio), captured on 26 October 2026. Full, unedited transcript: [docs/demo-transcript.md](docs/demo-transcript.md).

```text
# 17 tools: get_exchange_rates, convert_currency, get_recent_earthquakes, get_public_holidays, check_date, add_business_days, count_business_days, list_provinces, get_province, find_district, validate_tckn, validate_vkn, validate_iban, get_prayer_times, get_weather, turkish_text, amount_to_words

> convert_currency {"amount":1000,"from":"USD","to":"TRY"}
{
  "amount": 1000,
  "from": "USD",
  "to": "TRY",
  "result": 49762.7,
  "rate": 49.7627,
  "rate_type": "forex_selling",
  "bulletin_date": "2026-10-26",
  "source_url": "https://www.tcmb.gov.tr/kurlar/today.xml"
}

> add_business_days {"start":"2026-10-27","days":3}
{
  "start": "2026-10-27",
  "days": 3,
  "result": "2026-11-02",
  "result_weekday": "Monday"
}

> validate_iban {"iban":"TR36 0001 0001 2345 6789 0123 45"}
{
  "input": "TR36 0001 0001 2345 6789 0123 45",
  "valid": true,
  "formatted": "TR36 0001 0001 2345 6789 0123 45",
  "bank_code": "00010",
  "bank": "T.C. Ziraat Bankası A.Ş.",
  "reserved_digit": "0",
  "account_part": "0123456789012345"
}

> amount_to_words {"amount":1250.5}
{
  "amount": "1250.50",
  "currency": "TRY",
  "text": "Bin İki Yüz Elli Türk Lirası Elli Kuruş",
  "compact": "BinİkiYüzElliTL,ElliKr",
  "upper": "BİN İKİ YÜZ ELLİ TÜRK LİRASI ELLİ KURUŞ"
}

> turkish_text {"text":"istanbul ılık","operation":"upper"}
{
  "operation": "upper",
  "input": "istanbul ılık",
  "output": "İSTANBUL ILIK"
}
```

Why 2 November: 28 October is a half day, which still counts as a working day. 29 October is Republic Day and 31 October to 1 November is a weekend, so the three business days are 28 Oct, 30 Oct and 2 Nov.

## Data sources and accuracy

| Data | Source | Notes |
|---|---|---|
| Exchange rates | TCMB `today.xml` and daily archive | Indicative rates, published around 15:30 Türkiye time on business days. Not for trading. |
| Earthquakes | AFAD event API; Kandilli `lst0.asp` | Preliminary automatic solutions can be revised by the agencies. |
| Religious holidays | Diyanet "Resmi Tatiller" tables 2024-2035 | Bundled; if the government adds a bridge day (idari izin) it is not included. |
| Provinces/districts | turkey-neighbourhoods v4.0.3 (MIT) | 81 provinces, 973 districts. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). |
| Banks | TCMB EFT/FAST participant list (2026) | Used only to name the bank of an IBAN. |
| Prayer times | Aladhan API, method 13 (Diyanet) | Computed; can differ from Diyanet's official times by a minute or two. |
| Weather | Open-Meteo (CC BY 4.0) | Free for non-commercial use; see Open-Meteo terms for commercial use. |

Checksum validators only confirm that a number is well-formed. They do not prove that an ID, tax number or account exists.

## Development

```bash
npm install
npm run build
npm test                 # unit tests (offline, uses real captured fixtures)
npm run test:live        # hits the real APIs
node scripts/demo.mjs    # end-to-end over stdio
```

Pull requests are welcome, especially new public, key-free Türkiye data sources.

## Related projects

- [BerkantACUN/mcp-turkiye](https://github.com/BerkantACUN/mcp-turkiye): a broad, Turkish-first MCP server with many more endpoints. If you want maximum coverage, look there; turkiye-mcp focuses on a small, tested, key-free, English-first core.
- [saidsurucu/borsa-mcp](https://github.com/saidsurucu/borsa-mcp): Borsa İstanbul and fund data.
- [awesome-turkiye-dev](https://github.com/celaldrg/awesome-turkiye-dev): a curated list of Turkish developer resources.

## License

[MIT](LICENSE) © Celalettin Durğaç. Not affiliated with TCMB, AFAD, Kandilli, Diyanet or any other source listed above.
