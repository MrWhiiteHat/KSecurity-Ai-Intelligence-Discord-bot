const http = require('http');

const port = Number.parseInt(process.env.PORT || '3001', 10) || 3001;
let fallbackStarted = false;

function startFallbackServer(reason) {
  if (fallbackStarted) {
    return;
  }
  fallbackStarted = true;

  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'degraded',
        reason,
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'service_degraded',
      reason,
    }));
  });

  server.listen(port, '0.0.0.0', () => {
    console.error(`[safe-start] Fallback health server running on 0.0.0.0:${port}`);
  });
}

process.on('uncaughtException', (error) => {
  const message = error && error.stack ? error.stack : String(error);
  console.error('[safe-start] uncaughtException:', message);
  startFallbackServer('uncaught_exception');
});

process.on('unhandledRejection', (reason) => {
  const message = reason && reason.stack ? reason.stack : String(reason);
  console.error('[safe-start] unhandledRejection:', message);
  startFallbackServer('unhandled_rejection');
});

try {
  require('./dist/index.js');
} catch (error) {
  const message = error && error.stack ? error.stack : String(error);
  console.error('[safe-start] Failed to load backend entrypoint:', message);
  startFallbackServer('bootstrap_failure');
}
