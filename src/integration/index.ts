import Mocha from 'mocha';
import * as path from 'path';
import * as fs from 'fs';

export async function run(): Promise<void> {
  // Initialize Mocha with TDD UI so suite/test are available
  const ui = 'tdd';
  const mocha = new Mocha({ ui, color: true, timeout: 20000 });

  // Register Mocha TDD globals BEFORE loading test files
  // This ensures suite/test/it are available when test modules are required
  const mochaGlobals = (mocha as any).interfaces[ui];
  if (mochaGlobals) {
    (global as any).suite = mochaGlobals.suite || mochaGlobals.describe;
    (global as any).test = mochaGlobals.test || mochaGlobals.it;
    (global as any).it = mochaGlobals.it;
    (global as any).describe = mochaGlobals.describe;
    (global as any).before = mochaGlobals.before;
    (global as any).beforeEach = mochaGlobals.beforeEach;
    (global as any).after = mochaGlobals.after;
    (global as any).afterEach = mochaGlobals.afterEach;
    (global as any).skip = mochaGlobals.skip;
    (global as any).only = mochaGlobals.only;
  }

  // Discover test files from env or fallback to current directory
  const baseDir = process.env.INTEGRATION_TEST_DIR || __dirname;
  const testDir = path.resolve(baseDir);

  let testFiles: string[] = [];
  try {
    const entries = fs.readdirSync(testDir);
    testFiles = entries
      .filter((f) => f.endsWith('.test.js'))
      .map((f) => path.resolve(testDir, f));
  } catch (e) {
    console.error(`[integration] Failed to read test directory: ${testDir}`, e);
  }

  if (testFiles.length === 0) {
    console.warn(`[integration] No test files found under ${testDir}.`);
  } else {
    for (const file of testFiles) {
      mocha.addFile(file);
    }
  }

  console.log(
    `[integration] Mocha (${ui}) loading ${testFiles.length} file(s) from ${testDir}`
  );

  return new Promise<void>((resolve, reject) => {
    try {
      mocha
        .run((failures: number) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed`));
          } else {
            resolve();
          }
        })
        .on('test', (test) => {
          console.log(`[integration] running: ${test.fullTitle()}`);
        })
        .on('fail', (test, err) => {
          console.error(`[integration] failed: ${test.fullTitle()}`, err);
        })
        .on('end', () => {
          console.log('[integration] complete');
        });
    } catch (err) {
      console.error('[integration] runner error', err);
      reject(err);
    }
  });
}

