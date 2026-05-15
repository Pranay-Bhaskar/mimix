#  NanoMock

**The local runtime for AI-generated APIs.** 
A blazing-fast, zero-config mock server with strict Zod validation, a built-in performance dashboard, and Record & Replay capabilities. 

Stop wrestling with massive OpenAPI specs. Tell your AI to generate a `mock.json`, and run `nanomock`. 

##  Features

- **Strict Schema Validation:** Powered by Zod. If the frontend sends a bad payload, NanoMock throws a 400 with the exact missing fields.
- **Record & Replay:** Proxy a real backend to steal its responses and cache them locally for offline development.
- **Smart Autoschema:** Feed it a raw JSON file, and it will automatically generate strict Zod schemas (detecting UUIDs, Dates, and Emails).
- **Live Diagnostics Dashboard:** Built-in HTML dashboard to track latency, request volume, and error rates.
- **Hot-Reloading:** Change your `mock.json` and the server updates instantly.
- **Collision Proof:** Automatically finds the next available port if your requested port is busy.

##  Quick Start

**1. Install Globally**
\`\`\`bash
npm install -g nanomock
\`\`\`

**2. Initialize a Project**
\`\`\`bash
nanomock init
\`\`\`
*(This creates a `mock.json` file in your current directory).*

**3. Start the Server**
\`\`\`bash
nanomock serve -p 3000
\`\`\`

---

##  Commands

### `nanomock serve`
Starts the mock server reading from `mock.json`.
- **Options:** `-p, --port <number>` (Default: 3000)
- **Dashboard:** Navigate to `http://localhost:3000/_mockcli/dashboard` to view live traffic metrics.

### `nanomock record --proxy <url>`
Starts the server in Record & Replay mode.
- **How it works:** The first time you hit an endpoint, NanoMock forwards the request to the proxy URL and saves the response locally to `recorded_responses.json`. The second time, it intercepts the request and serves the cached payload instantly.

### `nanomock autoschema --from <file.json>`
Generates a highly-strict Zod schema based on raw JSON data. Perfect for feeding into your frontend types.

---

##  The `mock.json` Structure
NanoMock uses a simplified routing config. Instead of heavy JSON-Schema, just use stringified Zod definitions.

\`\`\`json
{
  "routes": [
    {
      "method": "POST",
      "path": "/api/users",
      "schema": {
        "body": {
          "email": "z.string().email()",
          "age": "z.number().min(18)",
          "id": "z.string().uuid()"
        }
      },
      "delay": { "min": 200, "max": 500 },
      "response": {
        "success": true,
        "message": "User validated!"
      }
    }
  ]
}
\`\`\`

##  Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
