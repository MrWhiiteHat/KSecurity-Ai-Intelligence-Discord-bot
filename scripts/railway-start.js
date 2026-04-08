const { spawn, spawnSync } = require('child_process');

function run(command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[railway-start] Child exited due to signal: ${signal}`);
      process.exit(1);
      return;
    }

    process.exit(code == null ? 1 : code);
  });
}

function runBlocking(command, args) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
}

function ensureBackendSchema() {
  console.log('[railway-start] Ensuring backend database schema with Prisma db push');

  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = runBlocking(npxCommand, [
    'prisma',
    'db',
    'push',
    '--schema=packages/backend/prisma/schema.prisma',
  ]);

  if (result.error) {
    console.error('[railway-start] Prisma db push failed to execute:', result.error);
    return;
  }

  if (result.status !== 0) {
    console.error(`[railway-start] Prisma db push exited with status ${result.status}. Continuing startup.`);
    return;
  }

  console.log('[railway-start] Prisma schema is up to date.');
}

const serviceHint = [
  process.env.APP_SERVICE,
  process.env.RAILWAY_SERVICE_NAME,
  process.env.SERVICE_NAME,
]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

const port = String(process.env.PORT || '3000');

if (serviceHint.includes('backend')) {
  console.log('[railway-start] Starting backend service');
  ensureBackendSchema();
  process.env.PORT = port;
  run(process.execPath, ['packages/backend/safe-start.js']);
} else if (serviceHint.includes('dash')) {
  console.log('[railway-start] Starting dashboard service');
  run(process.execPath, ['packages/dashboard/scripts/start.js']);
} else if (serviceHint.includes('bot')) {
  console.log('[railway-start] Starting bot service');
  run(process.execPath, ['packages/bot/dist/index.js']);
} else {
  console.log('[railway-start] Service hint not found; defaulting to backend service');
  process.env.PORT = port;
  run(process.execPath, ['packages/backend/safe-start.js']);
}
