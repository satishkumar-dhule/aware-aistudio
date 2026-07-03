const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../public/telemetry_data.json');

function generateTelemetry() {
  let data = { runs: [], testCases: [], suites: [], anomalies: [] };
  if (fs.existsSync(FILE_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    } catch (e) {
      console.error("Error parsing existing telemetry, creating new");
    }
  }

  // Ensure arrays exist
  data.runs = data.runs || [];
  data.testCases = data.testCases || [];
  data.suites = data.suites || [];
  data.anomalies = data.anomalies || [];

  const runNum = Math.floor(Math.random() * 10000);
  const id = `RUN-${runNum}-auto`;
  const suiteNames = ['PyTest_Backend_Suite', 'Playwright_E2E_Suite', 'Puppeteer_UI_Suite'];
  const chosenSuite = suiteNames[Math.floor(Math.random() * suiteNames.length)];
  
  const passedPercent = Math.floor(75 + Math.random() * 25);
  const isPassed = passedPercent >= 90;
  
  const testsCount = 500 + Math.floor(Math.random() * 50);
  const failedCount = Math.round(testsCount * ((100 - passedPercent) / 100));
  const flakyCount = Math.floor(failedCount * 0.2);
  const finalFailedCount = failedCount - flakyCount;
  const passedCount = testsCount - failedCount;
  
  const envs = ['QA', 'Prod', 'UAT'];
  const env = envs[Math.floor(Math.random() * envs.length)];
  
  const newRun = {
    id,
    name: `${chosenSuite}_Auto_Scheduled`,
    branch: "main",
    status: isPassed ? 'Passed' : 'Failed',
    environment: env,
    duration: `${Math.floor(1 + Math.random() * 8)}m ${Math.floor(Math.random() * 60)}s`,
    timestamp: 'Just now',
    passRate: passedPercent,
    triggeredBy: 'GitHub Actions',
    commit: `auto-${runNum}`,
    testsCount: testsCount,
    passedCount: passedCount,
    skippedCount: 0,
    failedCount: finalFailedCount,
    flakyCount: flakyCount,
    suite: chosenSuite,
    hasMemoryAnomaly: Math.random() > 0.8,
  };

  data.runs.unshift(newRun);

  // Auto-purging of runs: keep last 50
  if (data.runs.length > 50) {
    data.runs = data.runs.slice(0, 50);
  }

  const runIds = new Set(data.runs.map(r => r.id));

  // Generate tests
  const newTestCases = [];
  for (let i = 0; i < testsCount; i++) {
    let status = 'Passed';
    let errorMsg = undefined;
    let stackTrace = undefined;
    
    if (i < finalFailedCount) {
      status = 'Failed';
      errorMsg = 'AssertionError: expected value to be truthy';
      stackTrace = `at test.spec.ts:${10 + i}\nat processTicksAndRejections`;
    } else if (i < failedCount) {
      status = 'Flaky';
      errorMsg = 'TimeoutError: test timeout exceeded 5000ms';
    }

    newTestCases.push({
      id: `sim_test_${runNum}_${i}`,
      name: `module_${Math.floor(i / 10)}.spec.ts: Scheduled test ${i} [Auto]`,
      suiteId: chosenSuite,
      runId: id,
      folder: `src/tests/${chosenSuite.toLowerCase()}`,
      status: status,
      duration: `${Math.floor(Math.random() * 100)}ms`,
      tag: i % 2 === 0 ? 'api' : 'ui',
      priority: i % 10 === 0 ? 'P0 - Critical' : 'P1 - High',
      errorMsg: errorMsg,
      stackTrace: stackTrace,
    });
  }

  data.testCases = [...newTestCases, ...data.testCases];

  // Auto-purging of test cases to prevent large file sizes.
  // We keep only test cases that belong to the active runs
  data.testCases = data.testCases.filter(tc => runIds.has(tc.runId));

  // Ensure suites exist
  if (!data.suites.find(s => s.id === chosenSuite)) {
    data.suites.push({
      id: chosenSuite,
      name: chosenSuite,
      totalTests: testsCount,
      duration: newRun.duration,
      stability30d: passedPercent,
      environment: env,
      category: "Auto",
      heatmapHistory: Array(20).fill('Passed')
    });
  }

  // Append anomaly if memory
  if (newRun.hasMemoryAnomaly) {
    data.anomalies.unshift({
      id: `Anomaly_${runNum}`,
      type: "WARNING",
      text: `Memory spike detected in ${chosenSuite} during run ${id}`,
      badgeStyle: "bg-amber-500/10 text-amber-400 border border-amber-500/20"
    });
    if (data.anomalies.length > 10) {
      data.anomalies = data.anomalies.slice(0, 10);
    }
  }

  data.version = "1.2.0-secure";

  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Generated ${testsCount} tests for run ${id}`);
}

generateTelemetry();
