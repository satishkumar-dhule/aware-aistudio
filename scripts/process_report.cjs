const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, '../playwright-report.json');
const telemetryPath = path.join(__dirname, '../public/telemetry_data.json');

const envName = process.env.TEST_ENV || 'QA';

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
} catch (e) {
  console.error("Could not read playwright report", e);
  process.exit(1);
}

let telemetry = { runs: [], testCases: [], suites: [], anomalies: [] };
if (fs.existsSync(telemetryPath)) {
  try {
    telemetry = JSON.parse(fs.readFileSync(telemetryPath, 'utf8'));
  } catch (e) {
    console.error("Error parsing existing telemetry, creating new");
  }
}

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
      
      let errorMsg;
      let stackTrace;
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

const newRun = {
  id: runId,
  name: `${suiteName}_${envName}`,
  branch: "main",
  status: failedCount > 0 ? 'Failed' : 'Passed',
  environment: envName,
  duration: `${Math.floor(totalDuration / 1000)}s`,
  timestamp: new Date().toISOString(),
  passRate,
  triggeredBy: 'GitHub Actions',
  commit: `pw-${runNum}`,
  testsCount,
  passedCount,
  skippedCount,
  failedCount,
  flakyCount: 0,
  suite: suiteName,
  hasMemoryAnomaly: false,
};

telemetry.runs.unshift(newRun);
telemetry.testCases = [...testCases, ...telemetry.testCases];

if (telemetry.runs.length > 50) telemetry.runs = telemetry.runs.slice(0, 50);
const runIds = new Set(telemetry.runs.map(r => r.id));
telemetry.testCases = telemetry.testCases.filter(tc => runIds.has(tc.runId));

if (!telemetry.suites.find(s => s.id === suiteName)) {
  telemetry.suites.push({
    id: suiteName,
    name: suiteName,
    totalTests: testsCount,
    duration: `${Math.floor(totalDuration / 1000)}s`,
    stability30d: 95,
    environment: "All",
    category: "Regression",
    heatmapHistory: Array(20).fill('Passed')
  });
}

telemetry.version = "1.2.0-secure";

fs.writeFileSync(telemetryPath, JSON.stringify(telemetry, null, 2), 'utf8');
console.log(`Updated telemetry for ${envName}`);
