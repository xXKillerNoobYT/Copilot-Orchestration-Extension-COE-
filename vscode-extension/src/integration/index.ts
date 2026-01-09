import Mocha from 'mocha';
import * as path from 'path';
import * as fs from 'fs';

export async function run(): Promise<void> {
  // Initialize Mocha with TDD UI so suite/test are available
  const ui = 'tdd';
  const mocha = new Mocha({ ui, color: true, timeout: 20000 });

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

