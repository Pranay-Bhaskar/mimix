# Mimix

A zero-friction, local-first API mock server with strict Zod validation.

---

Stop wrestling with massive OpenAPI specs just to mock a simple login route. Mimix is designed for modern frontend developers: feed it a basic JSON config, and get a running API with strict schema validation, record/replay proxying, and a live metrics dashboard.

**Perfect for pairing with LLMs**—tell your AI to write a `mock.json`, and let Mimix serve it.


---

## Why does this exist?

Most basic JSON servers don't validate incoming payloads, leaving you to guess if your frontend is sending the right data. On the other end of the spectrum, enterprise mocking tools require writing hundreds of lines of YAML.

**Mimix hits the sweet spot.** Paste a stringified Zod schema into your config, and your frontend will instantly know if it's sending the wrong data type.

---

## Features

| Feature | Description |
|---------|-------------|
| **Strict Schema Validation** | Powered by Zod. If your frontend sends a string instead of a number, Mimix intercepts it and throws a strict `400 Bad Request` explaining exactly what field is missing. |
| **Record & Replay** | Proxy a real backend API, capture its responses, and cache them locally. Ideal for coding offline or when staging servers go down. |
| **Smart Autoschema** | Feed Mimix a raw JSON file, and it will intelligently generate strict Zod schemas for you, detecting UUIDs, dates, and emails. |
| **Built-in Dashboard** | Navigate to `/mimix/dashboard` to see live traffic, latency charts, and a log of recent requests. |
| **Hot-Reloading** | Tweak your `mock.json` and the server updates instantly without restarting. |
| **Collision Proof** | Automatically finds the next available port if your requested port is busy. |


---

## Quick Start

### 1. Install Globally

```bash
npm install -g mimix-cli
```

### 2. Initialize in Your Project

```bash
mimix init
```

This creates a blank `mock.json` file in your current directory.

### 3. Start the Server

```bash
mimix serve -p 3000
```

**UI:** Open `http://localhost:3000/mimix/dashboard` in your browser to view live traffic.

---

## CLI Commands

### `mimix serve`

Starts the mock server using your `mock.json` file.

**Options:**
- `-p, --port <number>` — Port to run on (default: `3000`)

---

### `mimix record --proxy <url>`

Starts the server in **Record & Replay** mode.

**How it works:**
1. First request → Mimix fetches from the real URL and saves to `recorded_responses.json`
2. Same request again → Mimix serves instantly from local cache

**Example:**
```bash
mimix record --proxy https://api.example.com --port 3001
```

---

### `mimix autoschema --from <file.json>`

Reads a raw JSON file and automatically generates a strict Zod schema block you can copy and paste directly into your `mock.json`.

**Example:**
```bash
mimix autoschema --from api-response.json
# Outputs: rapidmock-schema.json with Zod schema
```

---

## The `mock.json` API

No heavy schemas required. Just define your method, path, and stringified Zod definitions.

```json
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
```

---

## Contributing

Contributions, issues, and feature requests are welcome!

Feel free to open an issue to discuss your ideas before submitting a pull request.

---
