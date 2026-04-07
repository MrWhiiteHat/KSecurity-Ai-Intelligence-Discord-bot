const { spawn } = require('child_process');

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

const serviceHint = [
  process.env.APP_SERVICE,
  process.env.RAILWAY_SERVICE_NAME,
  process.env.SERVICE_NAME,
  process.env.RAILWAY_GIT_REPO_NAME,
]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

const port = String(process.env.PORT || '3000');

if (serviceHint.includes('bot')) {
  console.log('[railway-start] Starting bot service');
  run(process.execPath, ['packages/bot/dist/index.js']);
} else if (serviceHint.includes('dash')) {
  console.log('[railway-start] Starting dashboard service');
  run(process.execPath, ['packages/dashboard/scripts/start.js']);
} else {
  console.log('[railway-start] Starting backend service');
  process.env.PORT = port;
  run(process.execPath, ['packages/backend/safe-start.js']);
}
