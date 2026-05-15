#!/usr/bin/env node
/**
 * src/cli.js
 * Orchestrates the command-line interface using Commander.js.
 *
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { startServer } from './server.js';
import { startRecorder } from './recorder.js';

const program = new Command();

/**
 * Recursively maps primitive JSON values to Zod string representations.
 *
function inferType(val) {
  if (typeof val === 'string') return 'z.string()';
  if (typeof val === 'number') return 'z.number()';
  if (typeof val === 'boolean') return 'z.boolean()';
  if (Array.isArray(val)) {
    if (val.length > 0) return `z.array(${inferType(val[0])})`;
    return 'z.array(z.any())';
  }
  if (val !== null && typeof val === 'object') {
    const props = Object.entries(val)
      .map(([k, v]) => `"${k}": ${inferType(v)}`)
      .join(', ');
    return `z.object({ ${props} })`;
  }
  return 'z.any()';
}

export async function runCLI() {
  program
    .name('rapidmock')
    .description(chalk.blue('RapidMock: A lightweight, local-first API mock server'))
    .version('1.0.0');

  program
    .command('init')
    .description('Initialize a default mock.json configuration file in the current directory.')
    .action(async () => {
      const targetPath = path.resolve(process.cwd(), 'mock.json');
      const defaultConfig = {
        routes: [{
          method: 'POST',
          path: '/validate',
          schema: {  //  Zod strings, not JSON Schema
            body: {
              name: "z.string().min(1)",
              age: "z.number().min(18)"
            }
          },
          response: { success: true, description: 'Validated!' }
        }]
      };

      try {
        await fs.writeFile(targetPath, JSON.stringify(defaultConfig, null, 2));
        console.log(chalk.green(`\n Initialized configuration at ${targetPath}`));
        console.log(chalk.gray(`Run 'rapidmock serve' to start the server.\n`));
      } catch (err) {
        console.error(chalk.red(`❌ Failed to create mock.json: ${err.message}`));
      }
    });

  program
    .command('serve')
    .description('Start the RapidMock server using mock.json configurations.')
    .option('-p, --port <number>', 'Port to run the server on', '3000')
    .action(async (options) => {
      console.log(chalk.cyan(`\nStarting RapidMock Server on port ${options.port}...`));
      await startServer(parseInt(options.port, 10));
    });

  program
    .command('record')
    .description('Start the server in Record & Replay mode.')
    .requiredOption('--proxy <url>', 'The target URL to proxy requests to (e.g., https://api.example.com)')
    .option('-p, --port <number>', 'Port to run the local server on', '3000')
    .action(async (options) => {
      console.log(chalk.yellow(`\nStarting RapidMock in Record & Replay mode.`));
      console.log(chalk.gray(`Targeting proxy: ${options.proxy}`));
      await startRecorder(options.proxy, parseInt(options.port, 10));
    });

  program
    .command('autoschema')
    .description('Generate Zod schema from JSON')
    .requiredOption('--from <filename>', 'JSON file to analyze')
    .action(async (options) => {
      try {
        const filePath = path.resolve(process.cwd(), options.from);
        console.log(chalk.gray(`Reading file: ${filePath}`));

        const buffer = await fs.readFile(filePath);
        let dataStr;

        //  Handle Windows PowerShell UTF-16LE BOM
        if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
            dataStr = buffer.toString('utf16le');
        } else {
            // Handle standard UTF-8 and strip UTF-8 BOM if present
            dataStr = buffer.toString('utf-8');
            if (dataStr.charCodeAt(0) === 0xFEFF) {
                dataStr = dataStr.slice(1);
            }
        }

        const data = JSON.parse(dataStr); 
        const schemaStr = inferType(data); 

        const output = {
          zod_schema: schemaStr,
          example_data: data,
          generated_at: new Date().toISOString()
        };

        await fs.writeFile('rapidmock-schema.json', JSON.stringify(output, null, 2));
        console.log(chalk.green(`\n Schema saved: rapidmock-schema.json`));
        console.log(chalk.gray(`Schema: ${schemaStr}`));
      } catch (e) {
        console.error(chalk.red(` Error: ${e.message}`));
        console.error(chalk.gray(e.stack));
      }
    });

  program.parse(process.argv);
}

// Ensure CLI runs when file is executed directly
runCLI();


*/




/**
 * src/cli.js
 * Orchestrates the command-line interface using Commander.js.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { startServer } from './server.js';
import { startRecorder } from './recorder.js';



// Regex patterns for advanced type inference
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/; // basic ISO string
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Recursively maps primitive JSON values to Zod string representations.
 */
function inferType(val) {
  if (typeof val === 'string') {
    if (uuidRegex.test(val)) return 'z.string().uuid()';
    if (dateRegex.test(val) && !isNaN(Date.parse(val))) return 'z.string().datetime()';
    if (emailRegex.test(val)) return 'z.string().email()';
    return 'z.string()';
  }
  if (typeof val === 'number') return 'z.number()';
  if (typeof val === 'boolean') return 'z.boolean()';
  if (Array.isArray(val)) {
    if (val.length > 0) return `z.array(${inferType(val[0])})`;
    return 'z.array(z.any())';
  }
  if (val !== null && typeof val === 'object') {
    const props = Object.entries(val)
      .map(([k, v]) => `"${k}": ${inferType(v)}`)
      .join(', ');
    return `z.object({ ${props} })`;
  }
  return 'z.any()';
}

export async function runCLI() {
  const program = new Command();
  
  program
    .name('mimix')
    .description(chalk.blue('Mimix: A lightweight, local-first API mock server'))
    .version('1.0.0');

  program
    .command('init')
    .description('Initialize a default mock.json configuration file in the current directory.')
    .action(async () => {
      const targetPath = path.resolve(process.cwd(), 'mock.json');
      const defaultConfig = {
        routes: [{
          method: 'POST',
          path: '/validate',
          schema: {
            body: {
              name: "z.string().min(1)",
              age: "z.number().min(18)"
            }
          },
          response: { success: true, description: 'Validated!' }
        }]
      };

      try {
        await fs.writeFile(targetPath, JSON.stringify(defaultConfig, null, 2));
        console.log(chalk.green(`\n Initialized configuration at ${targetPath}`));
        console.log(chalk.gray(`Run 'mimix serve' to start the server.\n`));
      } catch (err) {
        console.error(chalk.red(` Failed to create mock.json: ${err.message}`));
      }
    });

  program
    .command('serve')
    .description('Start the Mimix server using mock.json configurations.')
    .option('-p, --port <number>', 'Port to run the server on', '3000')
    .action(async (options) => {
      console.log(chalk.cyan(`\nStarting Mimix Server on port ${options.port}...`));
      await startServer(parseInt(options.port, 10));
    });

  program
    .command('record')
    .description('Start the server in Record & Replay mode.')
    .requiredOption('--proxy <url>', 'The target URL to proxy requests to (e.g., https://api.example.com)')
    .option('-p, --port <number>', 'Port to run the local server on', '3000')
    .action(async (options) => {
      console.log(chalk.yellow(`\nStarting Mimix in Record & Replay mode.`));
      console.log(chalk.gray(`Targeting proxy: ${options.proxy}`));
      await startRecorder(options.proxy, parseInt(options.port, 10));
    });

  program
    .command('autoschema')
    .description('Generate Zod schema from JSON')
    .requiredOption('--from <filename>', 'JSON file to analyze')
    .action(async (options) => {
      try {
        const filePath = path.resolve(process.cwd(), options.from);
        console.log(chalk.gray(`Reading file: ${filePath}`));

        const buffer = await fs.readFile(filePath);
        let dataStr;

        //  Handle Windows PowerShell UTF-16LE BOM
        if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
          dataStr = buffer.toString('utf16le');
        } else {
          // Handle standard UTF-8 and strip UTF-8 BOM if present
          dataStr = buffer.toString('utf-8');
          if (dataStr.charCodeAt(0) === 0xFEFF) {
            dataStr = dataStr.slice(1);
          }
        }

        const data = JSON.parse(dataStr);
        const schemaStr = inferType(data);

        const output = {
          zod_schema: schemaStr,
          example_data: data,
          generated_at: new Date().toISOString()
        };

        await fs.writeFile('mimix-schema.json', JSON.stringify(output, null, 2));
        console.log(chalk.green(`\n Schema saved: mimix-schema.json`));
        console.log(chalk.gray(`Schema: ${schemaStr}`));
      } catch (e) {
        console.error(chalk.red(` Error: ${e.message}`));
        console.error(chalk.gray(e.stack));
      }
    });

  program.parse(process.argv);
}