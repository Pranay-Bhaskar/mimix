#!/usr/bin/env node
/**
 * bin/mimix.js
 * Entry point for the Mimix application.
 * Defers all execution logic to the modular CLI handler.
 */
import { runCLI } from '../src/cli.js';

runCLI().catch((error) => {
  console.error("Fatal Error:", error.message);
  process.exit(1);
});