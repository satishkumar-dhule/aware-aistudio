const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const dbPath = path.join(__dirname, '../public/telemetry.sqlite');

const reportPath = process.argv[2] || path.join(__dirname, '../playwright-report.json');
const envName = process.env.TEST_ENV || 'QA';

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
} catch (e) {
  console.error(`Could not read playwright report at ${reportPath}`, e);
  process.exit(1);
}

// Ensure the db exists
const db = new DatabaseSync(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    name TEXT,
    branch TEXT,
    status TEXT,
    environment TEXT,
    duration TEXT,
    timestamp TEXT,
    passRate INTEGER,
    triggeredBy TEXT,
    commit_hash TEXT,
    testsCount INTEGER,
    passedCount INTEGER,
    skippedCount INTEGER,
    failedCount INTEGER,
    flakyCount INTEGER,
    suite TEXT,
    hasMemoryAnomaly INTEGER
  );
  CREATE TABLE IF NOT EXISTS suites (
    id TEXT PRIMARY KEY,
    name TEXT,
    totalTests INTEGER,
    duration TEXT,
    stability30d INTEGER,
    environment TEXT,
    category TEXT,
    heatmapHistory TEXT
  );
  CREATE TABLE IF NOT EXISTS testCases (
    id TEXT PRIMARY KEY,
    name TEXT,
    suiteId TEXT,
    runId TEXT,
    folder TEXT,
    status TEXT,
    duration TEXT,
    tag TEXT,
    priority TEXT,
    errorMsg TEXT,
    stackTrace TEXT,
    FOREIGN KEY(runId) REFERENCES runs(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS anomalies (
    id TEXT PRIMARY KEY,
    type TEXT,
    target TEXT,
    severity TEXT,
    description TEXT,
    timestamp TEXT,
    resolved INTEGER
  );
`);

const runNum = Math.floor(Math.random() * 10000);
const runId = `RUN-${runNum}-${envName.toLowerCase()}`;
const suiteName = 'Website_E2E';

let passedCount = 0;
let failedCount = 0;
let skippedCount = 0;
let totalDuration = 0;

const testCases = [];
for (const suite of report.suites || []) {
  for (const s2 of suite.suites || []) {
    for (const spec of s2.specs || []) {
      const testName = spec.title;
      
      if (!spec.tests || spec.tests.length === 0 || !spec.tests[0].results || spec.tests[0].results.length === 0) {
          skippedCount++;
          continue;
      }
      
      const testResult = spec.tests[0].results[0];
      const status = testResult.status === 'expected' ? 'Passed' : 'Failed';
      const duration = testResult.duration || 0;
      totalDuration += duration;
      
      let errorMsg = null;
      let stackTrace = null;
      
      if (status === 'Failed') {
        failedCount++;
        errorMsg = testResult.error?.message || 'Test failed';
        stackTrace = testResult.error?.stack || '';
      } else {
        passedCount++;
      }

      testCases.push({
        id: `pw_${runNum}_${testCases.length}`,
        name: testName,
        suiteId: suiteName,
        runId: runId,
        folder: `tests/${envName}`,
        status,
        duration: `${duration}ms`,
        tag: 'e2e',
        priority: 'P1 - High',
        errorMsg,
        stackTrace
      });
    }
  }
}

const testsCount = passedCount + failedCount + skippedCount;
const passRate = testsCount > 0 ? Math.round((passedCount / testsCount) * 100) : 0;
const timestamp = new Date().toISOString();
const durationStr = `${Math.floor(totalDuration / 1000)}s`;
const statusStr = failedCount > 0 ? 'Failed' : 'Passed';
const runName = `${suiteName}_${envName}`;

const insertRun = db.prepare(`
  INSERT INTO runs (id, name, branch, status, environment, duration, timestamp, passRate, triggeredBy, commit_hash, testsCount, passedCount, skippedCount, failedCount, flakyCount, suite, hasMemoryAnomaly)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
insertRun.run(runId, runName, 'main', statusStr, envName, durationStr, timestamp, passRate, 'GitHub Actions', `pw-${runNum}`, testsCount, passedCount, skippedCount, failedCount, 0, suiteName, 0);

const insertTest = db.prepare(`
  INSERT INTO testCases (id, name, suiteId, runId, folder, status, duration, tag, priority, errorMsg, stackTrace)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const tc of testCases) {
  insertTest.run(tc.id, tc.name, tc.suiteId, tc.runId, tc.folder, tc.status, tc.duration, tc.tag, tc.priority, tc.errorMsg, tc.stackTrace);
}

const existingSuite = db.prepare(`SELECT id FROM suites WHERE id = ?`).get(suiteName);
if (!existingSuite) {
  const insertSuite = db.prepare(`
    INSERT INTO suites (id, name, totalTests, duration, stability30d, environment, category, heatmapHistory)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSuite.run(suiteName, suiteName, testsCount, durationStr, 95, 'All', 'Regression', JSON.stringify(Array(20).fill('Passed')));
}

// Ensure max 50 runs
const runs = db.prepare(`SELECT id FROM runs ORDER BY timestamp DESC`).all();
if (runs.length > 50) {
  const toDelete = runs.slice(50);
  const deleteRun = db.prepare(`DELETE FROM runs WHERE id = ?`);
  const deleteTests = db.prepare(`DELETE FROM testCases WHERE runId = ?`);
  for (const r of toDelete) {
    deleteTests.run(r.id);
    deleteRun.run(r.id);
  }
}

db.close();
console.log(`Updated sqlite telemetry for ${envName}`);
