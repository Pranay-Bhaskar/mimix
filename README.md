<div align="center">

# Mimix

**A zero-friction, local-first API mock server with strict Zod validation.**

[![npm version](https://img.shields.io/npm/v/mimix-cli?color=blue&style=flat-square)](https://www.npmjs.com/package/mimix-cli)
[![VS Code Extension](https://img.shields.io/visual-studio-marketplace/v/your-publisher-name.mimix?color=blueviolet&style=flat-square&label=VS%20Code)](https://marketplace.visualstudio.com/)
[![Build Status](https://img.shields.io/github/actions/workflow/status/your-github-username/mimix/test.yml?branch=main&style=flat-square)](https://github.com/your-github-username/mimix/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)


##  Links
* **GitHub Repository:** [Pranay-Bhaskar/mimix](https://github.com/Pranay-Bhaskar/mimix)
* **Report a Bug:** [Open an Issue](https://github.com/Pranay-Bhaskar/mimix/issues)

Stop wrestling with massive OpenAPI specs just to mock a simple login route. <br> Mimix is designed for modern frontend developers: feed it a basic JSON config, and get a running API with strict schema validation, record/replay proxying, and a live metrics dashboard.

<p align="center">
    <img src="https://raw.githubusercontent.com/Pranay-Bhaskar/mimix/main/docs/mimix.gif" alt="Bionify Terminal Output Demo" width="200"/>
  </p>

</div>

---

## Why does this exist?

Most basic JSON servers don't validate incoming payloads, leaving you to guess if your frontend is sending the right data. On the other end of the spectrum, enterprise mocking tools require writing hundreds of lines of tedious YAML.

**Mimix hits the sweet spot.** Paste a stringified Zod schema into your config, and your frontend will instantly know if it is sending the wrong data type. Perfect for pairing with LLMs—tell your AI to write a `mock.json`, and let Mimix serve it.

---

## Features

- **Strict Schema Validation:** Powered by Zod. If your frontend sends a string instead of a number, Mimix intercepts it and throws a strict `400 Bad Request` explaining exactly what field is missing.
- **Record & Replay:** Proxy a real backend API, capture its responses, and cache them locally. Ideal for coding offline or when staging servers go down.
- **Smart Autoschema:** Feed Mimix a raw JSON file, and it will intelligently generate strict Zod schemas for you, detecting UUIDs, dates, and emails.
- **Built-in Dashboard:** Navigate to `/mimix/dashboard` to see live traffic, latency charts, and a log of recent requests.
- **Hot-Reloading:** Tweak your `mock.json` and the server updates instantly without restarting.
- **Collision Proof:** Automatically finds the next available port if your requested port is busy.

<p align="center">
    <img src="https://raw.githubusercontent.com/Pranay-Bhaskar/mimix/main/docs/dashboard.png" alt="Bionify Terminal Output Demo" width="600"/>
  </p>
---

## Built With

Mimix is built using a modern, blazing-fast Node.js stack:

- **[Hono](https://hono.dev/):** Ultrafast web framework for the core server.
- **[Zod](https://zod.dev/):** TypeScript-first schema declaration and validation.
- **[Vitest](https://vitest.dev/):** Next-generation testing framework.
- **[Commander.js](https://github.com/tj/commander.js):** For the robust CLI interface.
- **VS Code API:** Seamless editor integration.

---

## Quick Start

### Option 1: VS Code Extension

Search for **Mimix** in the VS Code Extensions Marketplace and click install. Use the status bar at the bottom right to start and stop your server with one click!

### Option 2: CLI Interface

**1. Install Globally**

```bash
npm install -g mimix-cli
```

**2. Initialize in your project**

```bash
mimix init
```

(This creates a blank `mock.json` file in your current directory).

**3. Start the Server**

```bash
mimix serve -p 3000
```

---

## CLI Commands

### `mimix serve`

Starts the mock server using your `mock.json` file.

**Options:**
- `-p, --port <number>` (Default: `3000`)

**UI:** Open `http://localhost:3000/mimix/dashboard` in your browser to view live traffic.

---

### `mimix record --proxy <url>`

Starts the server in Record & Replay mode.

**How it works:** The first time you request an endpoint, Mimix fetches it from the real URL and saves the data to `recorded_responses.json`. Make the same request again, and Mimix serves it instantly from the local cache.

---

### `mimix autoschema --from <file.json>`

Reads a raw JSON file and automatically generates a strict Zod schema block you can copy and paste directly into your `mock.json`.

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

Contributions, issues, and feature requests are always welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. 