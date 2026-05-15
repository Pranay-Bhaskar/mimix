import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import getPort from 'get-port';

const RECORD_FILE = 'recorded_responses.json';

function generateRequestSignature(method, url, bodyStr = "") {
  const signature = `${method}|${new URL(url).pathname + new URL(url).search}|${bodyStr}`;
  return Buffer.from(signature).toString('base64');
}

export async function startRecorder(targetUrl, requestedPort) {
  const app = new Hono();
  const dbPath = path.resolve(process.cwd(), RECORD_FILE);

  //  Port Collision Handling
  const port = await getPort({ port: requestedPort });
  if (port !== requestedPort) {
    console.log(chalk.yellow(`\n  Port ${requestedPort} is in use. Mimix Recorder automatically bound to port ${port}.`));
  }

  // Init cache file
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify({}, null, 2));
  }

  app.all('*', async (c) => {
    const method = c.req.method;
    const urlPath = new URL(c.req.url).pathname + new URL(c.req.url).search;
    
    // IGNORE FAVICON & STATIC
    if (urlPath.includes('favicon.ico') || urlPath.includes('.ico')) {
      return c.text('', 204);
    }

    // Parse body safely
    let bodyStr = "";
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);
    if (hasBody) {
      try {
        const bodyBuffer = await c.req.arrayBuffer();
        const bodyText = new TextDecoder().decode(bodyBuffer);
        try {
          const parsed = JSON.parse(bodyText);
          bodyStr = JSON.stringify(parsed);
        } catch {
          bodyStr = bodyText; // Non-JSON body
        }
      } catch (e) {
        bodyStr = "";
      }
    }

    const signature = generateRequestSignature(method, c.req.url, bodyStr);

    // Load cache
    let cacheData = {};
    try {
      const fileData = await fs.readFile(dbPath, 'utf-8');
      cacheData = JSON.parse(fileData);
    } catch {}

    // REPLAY HIT
    if (cacheData[signature]) {
      console.log(chalk.green(`⏯  Replay: ${method} ${urlPath}`));
      const cached = cacheData[signature];
      return c.json(cached.body, cached.status || 200);
    }

    // PROXY MISS
    console.log(chalk.yellow(` Proxy: ${method} ${urlPath}`));
    
    try {
      const proxyUrl = `${targetUrl}${urlPath}`;
      const proxyResponse = await fetch(proxyUrl, {
        method,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mimix/1.0'
        },
        body: hasBody && bodyStr ? bodyStr : undefined
      });

      let responseBody;
      const contentType = proxyResponse.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        responseBody = await proxyResponse.json();
      } else {
        responseBody = await proxyResponse.text();
      }

      // CACHE HIT
      cacheData[signature] = {
        status: proxyResponse.status,
        body: responseBody
      };
      await fs.writeFile(dbPath, JSON.stringify(cacheData, null, 2));
      
      console.log(chalk.blue(` Cached: ${method} ${urlPath} (${proxyResponse.status})`));

      return contentType.includes('application/json') 
        ? c.json(responseBody, proxyResponse.status)
        : c.text(responseBody, proxyResponse.status);
        
    } catch (error) {
      console.error(chalk.red(` Proxy failed ${urlPath}: ${error.message}`));
      return c.json({ error: 'Proxy failed', target: targetUrl }, 502);
    }
  });

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(chalk.cyan(`\n Record Server: http://localhost:${info.port}`));
    console.log(chalk.gray(` Proxy target: ${targetUrl}`));
    console.log(chalk.magenta(' Cache: recorded_responses.json\n'));
  });
}