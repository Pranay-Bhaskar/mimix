#!/usr/bin/env node

import { runCLI } from '../src/cli.js';

runCLI().catch((error) => {
  console.error("Fatal Error:", error.message);
  process.exit(1);
});