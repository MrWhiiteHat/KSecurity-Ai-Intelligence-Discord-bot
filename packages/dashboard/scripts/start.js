const { spawn } = require('child_process');

const nextBin = require.resolve('next/dist/bin/next');
const port = String(process.env.PORT || '3000');

const child = spawn(process.execPath, [nextBin, 'start', '-p', port], {
  stdio: 'inherit',
  shell: false,
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
    return;
  }

  process.exit(code == null ? 1 : code);
});
