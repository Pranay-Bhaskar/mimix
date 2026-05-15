import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { startServer } from '../src/server.js';

describe('Mimix Server Logic', () => {
  let server;

  const mockConfig = {
    routes: [
      {
        method: 'POST',
        path: '/test-val',
        schema: { body: { age: "z.number().min(18)" } },
        response: { success: true }
      }
    ]
  };

  beforeAll(async () => {
    // 1. Create a temporary mock.json for testing
    await fs.writeFile(path.resolve(process.cwd(), 'mock.json'), JSON.stringify(mockConfig, null, 2));
    
    // 2. Start the server programmatically on port 3005
    server = await startServer(3005);
    
    // Give the file watcher a tiny fraction of a second to load the routes
    await new Promise(r => setTimeout(r, 200));
  });

  afterAll(async () => {
    // 3. Clean up: shut down the server and delete the temp file
    if (server) server.close();
    try {
      await fs.unlink(path.resolve(process.cwd(), 'mock.json'));
    } catch (e) {}
  });

  it('should return 400 when Zod validation fails', async () => {
    const response = await fetch('http://localhost:3005/test-val', {
        method: 'POST',
        body: JSON.stringify({ age: 10 }), // Invalid (under 18)
        headers: { 'Content-Type': 'application/json' }
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Validation Failed");
  });

  it('should return 200 when data is valid', async () => {
    const response = await fetch('http://localhost:3005/test-val', {
        method: 'POST',
        body: JSON.stringify({ age: 25 }), // Valid
        headers: { 'Content-Type': 'application/json' }
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});