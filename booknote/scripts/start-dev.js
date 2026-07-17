const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const children = [
  spawn(process.execPath, [path.join(root, 'scripts', 'spell-api-dev.js')], {
    cwd: root,
    stdio: 'inherit'
  }),
  spawn(npmCmd, ['run', 'react-start'], {
    cwd: root,
    stdio: 'inherit',
    shell: isWindows
  })
];

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

for (const child of children) {
  child.on('exit', code => {
    if (code && code !== 0) shutdown(code);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
