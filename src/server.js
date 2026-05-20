import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { z } from 'zod';
import getPort from 'get-port';

// --- Security Helpers ---
const escapeHtml = (unsafe) => {
  return (unsafe || '').toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

let requestLog = [];
let routerApp = new Hono();

async function loadRoutes() {
  const newApp = new Hono();
  const configPath = path.resolve(process.cwd(), 'mock.json');
  let configData;

  try {
    const fileContent = await fs.readFile(configPath, 'utf-8');
    configData = JSON.parse(fileContent);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(chalk.yellow(` mock.json not found. Serving default diagnostics.`));
    } else {
      console.error(chalk.red(` Failed to parse mock.json: ${error.message}`));
    }
  }

  if (configData && Array.isArray(configData.routes)) {
    for (const route of configData.routes) {
      const method = route.method.toLowerCase();
      const endpoint = route.path;
      const handlers = [];

      // 1. Zod Schema Compilation & Validation
      if (route.schema?.body) {
        const bodyShape = {};
        for (const [field, zodStr] of Object.entries(route.schema.body)) {
          try {
            // Note: Acceptable risk for local dev tools. 
            // Avoid `new Function` if moving to a cloud-hosted SaaS model.
            bodyShape[field] = new Function('z', `return ${zodStr}`)(z);
          } catch (e) {
            console.error(chalk.red(` Failed to compile schema for field '${field}': ${e.message}`));
            bodyShape[field] = z.any();
          }
        }
        const zodSchema = z.object(bodyShape);

        handlers.push(async (c, next) => {
          let body = {};
          
          // Only attempt to parse JSON if the client actually sent JSON
          const contentType = c.req.header('Content-Type') || '';
          if (contentType.includes('application/json')) {
            try {
              body = await c.req.json();
            } catch (e) {
              return c.json({ error: 'Invalid JSON body' }, 400);
            }
          }

          c.set('parsedBody', body);

          const result = zodSchema.safeParse(body);
          if (!result.success) {
            return c.json({
              error: "Validation Failed",
              details: result.error.errors.map(e => e.message)
            }, 400);
          }
          await next();
        });
      }

      // 2. Response Handling & Delays
      handlers.push(async (c) => {
        if (route.delay) {
          const { min = 0, max = 0, jitter = false } = route.delay;
          const delayMs = jitter ? Math.floor(Math.random() * (max - min + 1)) + min : min;
          if (delayMs > 0) await new Promise(res => setTimeout(res, delayMs));
        }

        let responseDef = route.response || (route.responses && route.responses.default);
        
        if (route.responses) {
          const accept = c.req.header('Accept') || '';
          const formatParam = c.req.query('format') || '';
          
          if (formatParam === 'xml' || accept.includes('application/xml') || accept.includes('text/xml')) {
            if (route.responses.xml) return c.text(route.responses.xml, 200, { 'Content-Type': 'application/xml' });
          } else if (formatParam === 'text' || accept.includes('text/plain')) {
            if (route.responses.text) return c.text(route.responses.text, 200, { 'Content-Type': 'text/plain' });
          } else {
            responseDef = route.responses.default || route.response;
          }
        }

        const status = responseDef?.status || 200;
        const body = responseDef?.body || responseDef;
        return c.json(body, status);
      });

      // 3. Mount Route
      if (typeof newApp[method] === 'function') {
        newApp[method](endpoint, ...handlers);
        console.log(chalk.green(`✓ ${method.toUpperCase()} ${endpoint}`));
      }
    }
  }
  
  routerApp = newApp;
}

export async function startServer(requestedPort) {
  const app = new Hono();

  // Port Collision Handling
  const port = await getPort({ port: requestedPort });
  if (port !== requestedPort) {
    console.log(chalk.yellow(`\n Port ${requestedPort} is in use. Mimix automatically bound to port ${port} instead.`));
  }

  // Global Logger Middleware
  app.use('*', async (c, next) => {
    if (c.req.path.startsWith('/mimix')) return next();
    
    const start = Date.now();
    await next();
    const latency = Date.now() - start;
    
    requestLog.unshift({
      timestamp: new Date().toISOString(),
      method: c.req.method,
      path: c.req.path,
      body: c.get('parsedBody') || {},
      status: c.res.status,
      latency
    });
    
    // Prevent memory leaks by capping the log array
    if (requestLog.length > 100) requestLog.pop();
  });

  // Diagnostic Endpoints
  app.get('/mimix/inspector', (c) => c.json(requestLog));
  
  app.get('/mimix/dashboard', (c) => {
    const totalReq = requestLog.length;
    const avgLatency = totalReq
      ? requestLog.reduce((acc, r) => acc + r.latency, 0) / totalReq
      : 0;
    const errRate = totalReq
      ? (requestLog.filter(r => r.status >= 400).length / totalReq) * 100
      : 0;

    const labels = JSON.stringify(
      requestLog.map((r) => new Date(r.timestamp).toLocaleTimeString()).reverse()
    );

    const latencyData = JSON.stringify(
      requestLog.map((r) => r.latency).reverse()
    );

    const rowsHtml = requestLog
      .slice(0, 10)
      .map((r) => {
        const method = String(r.method || '').toLowerCase();
        const knownMethods = ['get', 'post', 'put', 'patch', 'delete'];
        const methodClass = knownMethods.includes(method)
          ? 'pill-method-' + method
          : 'pill-method-default';
        const statusClass = r.status >= 400 ? 'status-bad' : 'status-ok';

        // Escaped HTML to prevent XSS attacks in the dashboard
        return `
          <tr>
            <td class="subtle num">${new Date(r.timestamp).toLocaleTimeString()}</td>
            <td><span class="pill ${methodClass}">${escapeHtml(r.method)}</span></td>
            <td class="mono">${escapeHtml(r.path)}</td>
            <td><span class="status ${statusClass}">${escapeHtml(r.status)}</span></td>
            <td class="subtle num">${r.latency} ms</td>
          </tr>
        `;
      })
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>RapidMock Performance Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link
      href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #000000;
        --bg-accent: rgba(56, 178, 172, 0.08);
        --panel: #040405;
        --panel-2: #020202;
        --border: rgba(255, 255, 255, 0.08);
        --text: #fafbfc;
        --muted: #9ca3af;
        --faint: #7a7f8b;
        --accent: #38b2ac;
        --success: #22c55e;
        --error: #ef4444;
        --shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
        --radius: 18px;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
      }

      body {
        min-height: 100vh;
        font-family: 'Satoshi', sans-serif;
        background:
          radial-gradient(circle at top left, var(--bg-accent), transparent 28%),
          var(--bg);
        color: var(--text);
        padding: 32px;
        line-height: 1.45;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }

      .shell {
        max-width: 1280px;
        margin: 0 auto;
      }

      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 24px;
      }

      .title-wrap h1 {
        margin: 0;
        font-size: 28px;
        line-height: 1.1;
        letter-spacing: -0.03em;
        font-weight: 700;
      }

      .title-wrap p {
        margin: 8px 0 0;
        color: var(--muted);
        font-size: 14px;
        max-width: 60ch;
      }

      .topbar-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--muted);
        font-size: 13px;
        white-space: nowrap;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: var(--panel-2);
        border: 1px solid var(--border);
        font-size: 12px;
        font-weight: 700;
        color: var(--text);
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--accent);
        box-shadow: 0 0 0 4px rgba(56, 178, 172, 0.14);
        flex: 0 0 auto;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }

      .card {
        background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
        background-color: var(--panel);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
      }

      .kpi {
        padding: 18px 18px 16px;
      }

      .kpi-label {
        margin: 0 0 14px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--faint);
      }

      .kpi-value {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin: 0;
        font-size: 32px;
        line-height: 1;
        letter-spacing: -0.04em;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .kpi-unit {
        font-size: 16px;
        color: var(--muted);
        font-weight: 600;
      }

      .kpi-meta {
        margin-top: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: var(--muted);
        font-size: 13px;
      }

      .panel {
        padding: 18px;
      }

      .panel-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        margin-bottom: 14px;
      }

      .panel-head h2 {
        margin: 0;
        font-size: 16px;
        letter-spacing: -0.02em;
      }

      .panel-head p {
        margin: 4px 0 0;
        color: var(--muted);
        font-size: 13px;
      }

      .chart-wrap {
        margin-bottom: 18px;
      }

      .chart-shell {
        position: relative;
        width: 100%;
        height: 320px;
      }

      .table-wrap {
        overflow: hidden;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }

      thead th {
        text-align: left;
        padding: 14px 16px;
        color: var(--faint);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
        border-bottom: 1px solid var(--border);
      }

      tbody td {
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        vertical-align: middle;
      }

      tbody tr:last-child td {
        border-bottom: none;
      }

      tbody tr:hover {
        background: rgba(255, 255, 255, 0.025);
      }

      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      .num {
        font-variant-numeric: tabular-nums;
      }

      .subtle {
        color: var(--muted);
      }

      .pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 56px;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid transparent;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .pill-method-get {
        background: rgba(59, 130, 246, 0.12);
        color: #93c5fd;
        border-color: rgba(59, 130, 246, 0.18);
      }

      .pill-method-post {
        background: rgba(34, 197, 94, 0.12);
        color: #86efac;
        border-color: rgba(34, 197, 94, 0.18);
      }

      .pill-method-put,
      .pill-method-patch {
        background: rgba(245, 158, 11, 0.12);
        color: #fcd34d;
        border-color: rgba(245, 158, 11, 0.18);
      }

      .pill-method-delete {
        background: rgba(239, 68, 68, 0.12);
        color: #fca5a5;
        border-color: rgba(239, 68, 68, 0.18);
      }

      .pill-method-default {
        background: rgba(255, 255, 255, 0.08);
        color: #d1d5db;
        border-color: rgba(255, 255, 255, 0.1);
      }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }

      .status::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: currentColor;
        opacity: 0.95;
      }

      .status-ok {
        color: var(--success);
      }

      .status-bad {
        color: var(--error);
      }

      @media (max-width: 900px) {
        body {
          padding: 20px;
        }

        .topbar {
          flex-direction: column;
          align-items: stretch;
        }

        .topbar-meta {
          white-space: normal;
        }

        .kpi-grid {
          grid-template-columns: 1fr;
        }

        .chart-shell {
          height: 260px;
        }

        .table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        table {
          min-width: 760px;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="topbar">
        <div class="title-wrap">
          <h1>MIMIX</h1>
          <p>Request health, latency trends, and recent traffic across your mock endpoints.</p>
        </div>
        <div class="topbar-meta">
          <div class="badge"><span class="dot"></span> Live metrics</div>
          <span>Updated just now</span>
        </div>
      </div>

      <section class="kpi-grid">
        <article class="card kpi">
          <p class="kpi-label">Total Requests</p>
          <p class="kpi-value num">${totalReq.toLocaleString()}</p>
          <div class="kpi-meta">
            <span>Across all endpoints</span>
            <span class="subtle">24h</span>
          </div>
        </article>

        <article class="card kpi">
          <p class="kpi-label">Avg Latency</p>
          <p class="kpi-value num">
            ${avgLatency.toFixed(2)}
            <span class="kpi-unit">ms</span>
          </p>
          <div class="kpi-meta">
            <span>Average request response</span>
            <span class="subtle">Rolling avg</span>
          </div>
        </article>

        <article class="card kpi">
          <p class="kpi-label">Error Rate</p>
          <p class="kpi-value num">
            ${errRate.toFixed(1)}
            <span class="kpi-unit">%</span>
          </p>
          <div class="kpi-meta">
            <span>${errRate > 2 ? 'Needs attention' : 'Within threshold'}</span>
            <span class="${errRate > 2 ? 'status-bad' : 'status-ok'} status">
              ${errRate > 2 ? 'Elevated' : 'Healthy'}
            </span>
          </div>
        </article>
      </section>

      <section class="card panel chart-wrap">
        <div class="panel-head">
          <div>
            <h2>Latency Trend</h2>
            <p>Recent request latency over time.</p>
          </div>
        </div>
        <div class="chart-shell">
          <canvas id="latencyChart"></canvas>
        </div>
      </section>

      <section class="card panel">
        <div class="panel-head">
          <div>
            <h2>Recent Requests</h2>
            <p>Latest traffic sampled from the request log.</p>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <script>
      const labels = ${labels};
      const latencyData = ${latencyData};

      const ctx = document.getElementById('latencyChart').getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 260);
      gradient.addColorStop(0, 'rgba(56, 178, 172, 0.28)');
      gradient.addColorStop(1, 'rgba(56, 178, 172, 0.02)');

      new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Latency',
              data: latencyData,
              borderColor: '#38b2ac',
              backgroundColor: gradient,
              fill: true,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBackgroundColor: '#38b2ac',
              pointHoverBorderColor: '#0f1115',
              pointHoverBorderWidth: 2,
              tension: 0.35
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: '#11151b',
              borderColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              titleColor: '#f3f4f6',
              bodyColor: '#d1d5db',
              displayColors: false,
              padding: 12,
              callbacks: {
                label: function (context) {
                  return context.parsed.y + ' ms';
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: '#6b7280',
                maxTicksLimit: 6
              },
              border: {
                display: false
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(255,255,255,0.06)',
                drawBorder: false
              },
              ticks: {
                color: '#6b7280',
                callback: function (value) {
                  return value + ' ms';
                }
              },
              border: {
                display: false
              }
            }
          }
        }
      });
    </script>
  </body>
</html>`;

    return c.html(html);
  });

  // Dynamic Router Interceptor
  app.use('*', async (c, next) => {
    const res = await routerApp.fetch(c.req.raw);
    if (res.status === 404) {
      return await next();
    }
    return res;
  });

  app.get('/', (c) => c.json({ 
    message: 'Mimix v1.0.0', 
    dashboard: '/mimix/dashboard',
    routes: '/mimix/routes'
  }));

  app.notFound((c) => c.json({ 
    error: 'Not Found', 
    endpoints: ['/mimix/dashboard', '/mimix/inspector']
  }, 404));

  await loadRoutes();

  let reloadTimeout;
  chokidar.watch('mock.json').on('change', () => {
    clearTimeout(reloadTimeout);
    reloadTimeout = setTimeout(async () => {
      console.log(chalk.yellow('\n mock.json changed. Reloading routes...'));
      await loadRoutes();
    }, 300);
  });

  // Start the underlying Node server
  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(chalk.cyan(`\n Server is listening on http://localhost:${info.port}`));
    console.log(chalk.gray(` Dashboard: http://localhost:${info.port}/mimix/dashboard\n`));
  });
  
  return server;
}