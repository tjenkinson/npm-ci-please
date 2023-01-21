#!/usr/bin/env node

const { readFileSync, writeFileSync, rmSync } = require('node:fs');
const { spawn } = require('node:child_process');

const skipNative = process.argv.slice(2).includes('--skip-native');
const resetPackageLock = !process.argv
  .slice(2)
  .includes('--do-not-reset-package-lock');

const onSigInt = new Set();

const log = (msg) => console.log(`[npm-ci-please] ${msg}`);

const invalidPackageLock = Symbol('invalidPackageLock');
const exception = Symbol('exception');
const success = Symbol('success');

const exec = (command, ...args) => {
  return new Promise((resolve, reject) => {
    const handle = spawn(command, args, {
      stdio: ['ignore', 'inherit', 'inherit'],
    });

    const kill = () => handle.kill();
    onSigInt.add(kill);

    handle.once('close', (code) => {
      onSigInt.delete(kill);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Exit code: ${code}`));
      }
    });
  });
};

const readPackageLock = () => {
  return readFileSync('./package-lock.json', {
    encoding: 'utf8',
  });
};

const tryNative = async () => {
  try {
    await exec('npm', 'ci');
  } catch (e) {
    return exception;
  }

  return success;
};

const tryWorkaround = async () => {
  const packageLock = readPackageLock();

  log('Removing node_modules');
  rmSync('./node_modules', { recursive: true, force: true });

  log('Running `npm install`');
  try {
    await exec('npm', 'install');
  } catch {
    return exception;
  }

  if (readPackageLock() !== packageLock) {
    if (resetPackageLock) writeFileSync('./package-lock.json', packageLock);

    return invalidPackageLock;
  }

  return success;
};

const go = async () => {
  process.on('SIGINT', () => {
    onSigInt.forEach((cb) => cb());
    console.log('Aborting...');
    process.exit(1);
  });

  if (!skipNative) {
    log('Trying native `npm ci`');
    if ((await tryNative()) === success) {
      log('Native `npm ci` worked');
      process.exit(0);
    }

    log('Native `npm ci` failed');
  }

  log('Performing workaround...');

  const workaroundRes = await tryWorkaround();
  if (workaroundRes === success) {
    log('Workaround succeeded');
    process.exit(0);
  }
  if (workaroundRes === invalidPackageLock) {
    log('Failed: package-lock.json changed and is therefore not in sync');
  } else {
    log('Failed: unexpected error');
  }

  process.exit(1);
};

go().catch((e) => {
  console.error('Unexpected error');
  console.error(e);
  process.exit(1);
});
