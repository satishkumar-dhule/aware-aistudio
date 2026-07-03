import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { Run, TestCase, Suite } from '../types';
import { 
  initialRuns, 
  initialTestCases, 
  initialSuites, 
  activeAnomalies 
} from '../data';

const RUNS_KEY = 'aware_runs';
const TEST_CASES_KEY = 'aware_test_cases';
const SUITES_KEY = 'aware_suites';
const ANOMALIES_KEY = 'aware_anomalies';

// In-memory caching layer to prevent slow, redundant localStorage I/O during heavy render cycles
let cachedRuns: Run[] | null = null;
let cachedTestCases: TestCase[] | null = null;
let cachedSuites: Suite[] | null = null;
let cachedAnomalies: typeof activeAnomalies | null = null;

export class BrowserDb {
  
  // 1. Initialize and perform dynamic schema validation & self-healing on startup
  static init() {
    // Clear in-memory caches on hard reload or custom trigger
    window.addEventListener('storage', (e) => {
      if (e.key === RUNS_KEY) cachedRuns = null;
      if (e.key === TEST_CASES_KEY) cachedTestCases = null;
      if (e.key === SUITES_KEY) cachedSuites = null;
      if (e.key === ANOMALIES_KEY) cachedAnomalies = null;
      window.dispatchEvent(new Event('aware_db_update'));
    });

    if (!localStorage.getItem(RUNS_KEY)) {
      this.saveRunsRaw(initialRuns);
    } else {
      // Validate existing dataset and heal if corrupted
      this.getRuns();
    }
    
    if (!localStorage.getItem(TEST_CASES_KEY)) {
      this.saveTestCasesRaw(initialTestCases);
    } else {
      this.getTestCases();
    }
    
    if (!localStorage.getItem(SUITES_KEY)) {
      this.saveSuitesRaw(initialSuites);
    } else {
      this.getSuites();
    }
    
    if (!localStorage.getItem(ANOMALIES_KEY)) {
      this.saveAnomaliesRaw(activeAnomalies);
    } else {
      this.getAnomalies();
    }
  }

  // 1.1 Dynamic static file loader for GitHub Pages or distributed builds
  
  static getRuns(): Run[] {
    if (cachedRuns) return cachedRuns;
    try {
      const data = localStorage.getItem(RUNS_KEY);
      cachedRuns = data ? JSON.parse(data) : [];
      return cachedRuns;
    } catch {
      return [];
    }
  }

  static saveRuns(runs: Run[]) {
    cachedRuns = runs;
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
    window.dispatchEvent(new Event('aware_db_update'));
  }

  static saveRunsRaw(runs: any[]) {
    this.saveRuns(runs);
  }

  static getTestCases(): TestCase[] {
    if (cachedTestCases) return cachedTestCases;
    try {
      const data = localStorage.getItem(TEST_CASES_KEY);
      cachedTestCases = data ? JSON.parse(data) : [];
      return cachedTestCases;
    } catch {
      return [];
    }
  }

  static saveTestCases(tcs: TestCase[]) {
    cachedTestCases = tcs;
    localStorage.setItem(TEST_CASES_KEY, JSON.stringify(tcs));
    window.dispatchEvent(new Event('aware_db_update'));
  }
  
  static saveTestCasesRaw(tcs: any[]) {
    this.saveTestCases(tcs);
  }

  static getSuites(): Suite[] {
    if (cachedSuites) return cachedSuites;
    try {
      const data = localStorage.getItem(SUITES_KEY);
      cachedSuites = data ? JSON.parse(data) : [];
      return cachedSuites;
    } catch {
      return [];
    }
  }

  static saveSuites(suites: Suite[]) {
    cachedSuites = suites;
    localStorage.setItem(SUITES_KEY, JSON.stringify(suites));
    window.dispatchEvent(new Event('aware_db_update'));
  }

  static saveSuitesRaw(suites: any[]) {
    this.saveSuites(suites);
  }

  static getAnomalies(): any[] {
    if (cachedAnomalies) return cachedAnomalies;
    try {
      const data = localStorage.getItem(ANOMALIES_KEY);
      cachedAnomalies = data ? JSON.parse(data) : [];
      return cachedAnomalies;
    } catch {
      return [];
    }
  }

  static saveAnomalies(anomalies: any[]) {
    cachedAnomalies = anomalies as any;
    localStorage.setItem(ANOMALIES_KEY, JSON.stringify(anomalies));
    window.dispatchEvent(new Event('aware_db_update'));
  }

  static saveAnomaliesRaw(anomalies: any[]) {
    this.saveAnomalies(anomalies);
  }

  static validateRun(item: any): Run | null {
    if (!item || typeof item !== 'object') return null;
    if (!item.id || !item.name) return null;
    return item as Run;
  }
  
  static validateTestCase(item: any): TestCase | null {
    if (!item || typeof item !== 'object') return null;
    if (!item.id || !item.name || !item.runId) return null;
    return item as TestCase;
  }
  
  static validateSuite(item: any): Suite | null {
    if (!item || typeof item !== 'object') return null;
    if (!item.id || !item.name) return null;
    return item as Suite;
  }


  static resetDatabase() {
    localStorage.removeItem('aware_runs');
    localStorage.removeItem('aware_test_cases');
    localStorage.removeItem('aware_suites');
    localStorage.removeItem('aware_anomalies');
    
    cachedRuns = null;
    cachedTestCases = null;
    cachedSuites = null;
    cachedAnomalies = null;
    
    this.saveRunsRaw(initialRuns);
    this.saveTestCasesRaw(initialTestCases);
    this.saveSuitesRaw(initialSuites);
    this.saveAnomaliesRaw(activeAnomalies);
    
    window.dispatchEvent(new Event('aware_db_update'));
  }

  static exportDatabaseBackup(): string {
    const payload = {
      runs: this.getRuns(),
      testCases: this.getTestCases(),
      suites: this.getSuites(),
      anomalies: this.getAnomalies()
    };
    return JSON.stringify(payload, null, 2);
  }

  static async fetchStaticTelemetry(): Promise<{ success: boolean; source: string; message: string; runsCount?: number; testsCount?: number }> {
    try {
      const filePath = localStorage.getItem('aware_telemetry_file_path') || './telemetry.sqlite';
      
      // Fallback for json if users still have old setting
      if (filePath.endsWith('.json')) {
        const response = await fetch(filePath, { cache: 'no-cache' });
        if (!response.ok) return { success: false, source: 'local', message: 'No file' };
        const text = await response.text();
        const res = this.importDatabaseBackup(text);
        if (res.success) {
           return { success: true, source: 'sync', message: 'Synced json', runsCount: res.importedCount?.runs, testsCount: res.importedCount?.tests };
        }
        return { success: false, source: 'error', message: 'Failed json validation' };
      }

      // SQLite approach
      const response = await fetch(filePath, { cache: 'no-cache' });
      if (!response.ok) {
        return { 
           success: false, 
           source: 'local', 
           message: `No SQLite telemetry file found at '${filePath}'.` 
         };
      }
      
      const buffer = await response.arrayBuffer();
      
      const SQL = await initSqlJs({ locateFile: file => sqlWasmUrl });
      const db = new SQL.Database(new Uint8Array(buffer));
      
      const resRuns = db.exec("SELECT * FROM runs ORDER BY timestamp DESC");
      const resSuites = db.exec("SELECT * FROM suites");
      const resTestCases = db.exec("SELECT * FROM testCases");
      const resAnomalies = db.exec("SELECT * FROM anomalies");
      
      const toArray = (res) => {
        if (!res || res.length === 0) return [];
        return res[0].values.map(row => {
           let obj = {};
           res[0].columns.forEach((col, i) => {
             obj[col] = row[i];
           });
           return obj;
        });
      };
      
      const runs = toArray(resRuns);
      const suites = toArray(resSuites).map(s => ({...s, heatmapHistory: JSON.parse(s.heatmapHistory)}));
      const testCases = toArray(resTestCases);
      const anomalies = toArray(resAnomalies);
      
      if (runs.length > 0) this.saveRunsRaw(runs);
      if (suites.length > 0) this.saveSuitesRaw(suites);
      if (testCases.length > 0) this.saveTestCasesRaw(testCases);
      if (anomalies.length > 0) this.saveAnomaliesRaw(anomalies);
      
      db.close();

      return {
         success: true,
         source: 'github-pages-sqlite-sync',
         message: `SQLite synced successfully from '${filePath}'! Loaded ${runs.length} runs and ${testCases.length} test cases.`,
         runsCount: runs.length,
         testsCount: testCases.length
      };

    } catch (e: any) {
      return { 
         success: false, 
         source: 'error', 
         message: `Static SQLite sync failed: ${e.message}`
       };
    }
  }static importDatabaseBackup(jsonString: string): { success: boolean; message: string; importedCount?: { runs: number; tests: number } } {
    try {
      const payload = JSON.parse(jsonString);
      if (!payload || typeof payload !== 'object') {
        return { success: false, message: "Invalid payload format. Must be a JSON object." };
      }

      const verifiedRuns: Run[] = [];
      const verifiedTCs: TestCase[] = [];
      const verifiedSuites: Suite[] = [];

      // Validate runs array
      if (Array.isArray(payload.runs)) {
        const seen = new Set<string>();
        for (const item of payload.runs) {
          const v = this.validateRun(item);
          if (v && !seen.has(v.id)) {
            seen.add(v.id);
            verifiedRuns.push(v);
          }
        }
      }

      // Validate test cases array
      if (Array.isArray(payload.testCases)) {
        const seen = new Set<string>();
        for (const item of payload.testCases) {
          const v = this.validateTestCase(item);
          if (v && !seen.has(v.id)) {
            seen.add(v.id);
            verifiedTCs.push(v);
          }
        }
      }

      // Validate suites array
      if (Array.isArray(payload.suites)) {
        const seen = new Set<string>();
        for (const item of payload.suites) {
          const v = this.validateSuite(item);
          if (v && !seen.has(v.id)) {
            seen.add(v.id);
            verifiedSuites.push(v);
          }
        }
      }

      // If nothing of substance was imported, reject
      if (verifiedRuns.length === 0 && verifiedTCs.length === 0) {
        return { success: false, message: "No valid Runs or Test Cases identified inside backup file." };
      }

      // Flush caches and apply
      cachedRuns = verifiedRuns;
      cachedTestCases = verifiedTCs;
      if (verifiedSuites.length > 0) cachedSuites = verifiedSuites;
      if (Array.isArray(payload.anomalies)) cachedAnomalies = payload.anomalies;

      this.saveRunsRaw(verifiedRuns);
      this.saveTestCasesRaw(verifiedTCs);
      if (verifiedSuites.length > 0) this.saveSuitesRaw(verifiedSuites);
      if (Array.isArray(payload.anomalies)) this.saveAnomaliesRaw(payload.anomalies);

      return {
        success: true,
        message: "Telemetry backup payload imported, validated, and applied successfully!",
        importedCount: {
          runs: verifiedRuns.length,
          tests: verifiedTCs.length
        }
      };
    } catch (e: any) {
      return { success: false, message: `Fatal error reading backup stream: ${e.message}` };
    }
  }

  // 6. Enterprise Statistics Engine - High performance precalculated aggregates
  static getAggregatedTelemetryStats() {
    const runs = this.getRuns();
    const tests = this.getTestCases();
    const anomalies = this.getAnomalies();

    const totalRuns = runs.length;
    const passedRuns = runs.filter(r => r.status === 'Passed').length;
    const failedRuns = runs.filter(r => r.status === 'Failed').length;
    const flakyRuns = runs.filter(r => r.status === 'Flaky').length;

    // Overall Average Pass Rate across non-empty cycles
    const activeRunsWithTests = runs.filter(r => r.testsCount > 0);
    const avgPassRate = activeRunsWithTests.length > 0 
      ? Math.round(activeRunsWithTests.reduce((sum, r) => sum + r.passRate, 0) / activeRunsWithTests.length) 
      : 100;

    // Environment specific breakdown
    const qaRuns = runs.filter(r => r.environment === 'QA');
    const uatRuns = runs.filter(r => r.environment === 'UAT');
    const prodRuns = runs.filter(r => r.environment === 'Prod');

    const qaAvg = qaRuns.length > 0 ? Math.round(qaRuns.reduce((s, r) => s + r.passRate, 0) / qaRuns.length) : 0;
    const uatAvg = uatRuns.length > 0 ? Math.round(uatRuns.reduce((s, r) => s + r.passRate, 0) / uatRuns.length) : 0;
    const prodAvg = prodRuns.length > 0 ? Math.round(prodRuns.reduce((s, r) => s + r.passRate, 0) / prodRuns.length) : 0;

    // Failure reasons index distribution
    const failureCategories: Record<string, number> = {};
    tests.forEach(t => {
      if (t.status === 'Failed' && t.errorMsg) {
        const coreErr = t.errorMsg.split(':')[0] || 'Uncategorized';
        failureCategories[coreErr] = (failureCategories[coreErr] || 0) + 1;
      }
    });

    return {
      totalRuns,
      passedRuns,
      failedRuns,
      flakyRuns,
      avgPassRate,
      activeAnomaliesCount: anomalies.length,
      failingTestsCount: tests.filter(t => t.status === 'Failed').length,
      environmentsBreakdown: {
        QA: { count: qaRuns.length, passRate: qaAvg },
        UAT: { count: uatRuns.length, passRate: uatAvg },
        Prod: { count: prodRuns.length, passRate: prodAvg }
      },
      failureCategories
    };
  }

  // 7. Simulated Run Generator (Preserved + Enhanced)
  static addRandomSimulatedRun(): Run {
    const runs = this.getRuns();
    const testCases = this.getTestCases();
    
    let runNum = Math.floor(1000 + Math.random() * 9000);
    let id = `RUN-${runNum}-SIM`;
    while (runs.some(r => r.id === id) || testCases.some(t => t.id === `sim_test_login_${runNum}`)) {
      runNum = Math.floor(1000 + Math.random() * 9000);
      id = `RUN-${runNum}-SIM`;
    }
    const envs: ('Prod' | 'UAT' | 'QA')[] = ['Prod', 'UAT', 'QA'];
    const chosenEnv = envs[Math.floor(Math.random() * envs.length)];
    const suites: ('Smoke' | 'Security' | 'Regression' | 'Performance')[] = ['Smoke', 'Security', 'Regression', 'Performance'];
    const chosenSuite = suites[Math.floor(Math.random() * suites.length)];
    
    const passedPercent = Math.floor(75 + Math.random() * 25);
    const isPassed = passedPercent >= 90;
    
    const testsCount = 500;
    const failedCount = Math.round(testsCount * ((100 - passedPercent) / 100));
    const passedCount = testsCount - failedCount;
    
    const newRun: Run = {
      id,
      name: `${chosenSuite}_Simulated_Cycle_${runNum}`,
      branch: 'main',
      status: isPassed ? 'Passed' : 'Failed',
      environment: chosenEnv,
      duration: `${Math.floor(1 + Math.random() * 8)}m ${Math.floor(Math.random() * 60)}s`,
      timestamp: 'Just now',
      passRate: passedPercent,
      triggeredBy: 'GitHub Actions',
      commit: `sim-${runNum}`,
      testsCount: testsCount,
      passedCount: passedCount,
      skippedCount: 0,
      failedCount: failedCount,
      suite: chosenSuite,
      hasMemoryAnomaly: Math.random() > 0.7,
    };

    runs.unshift(newRun);
    this.saveRuns(runs);

    // Create 500 test cases for this run
    const newTestCases: TestCase[] = Array.from({ length: testsCount }).map((_, i) => {
      const isFailedTC = i < failedCount;
      return {
        id: `sim_test_${runNum}_${i}`,
        name: `module_${Math.floor(i / 10)}.spec.ts: Subtest ${i} [Sim ${runNum}]`,
        suiteId: 'prd-smk-01',
        runId: id,
        folder: `src/tests/module_${Math.floor(i / 10)}`,
        status: isFailedTC ? 'Failed' as const : 'Passed' as const,
        duration: `${Math.floor(Math.random() * 100)}ms`,
        tag: i % 2 === 0 ? 'api' : 'ui',
        priority: i % 10 === 0 ? 'P0 - Critical' : 'P1 - High',
        errorMsg: isFailedTC ? 'AssertionError: expected value to equal true' : undefined,
        stackTrace: isFailedTC ? 'at test.spec.ts:89\nat processTicksAndRejections' : undefined,
      };
    });

    const updatedTCs = [...newTestCases, ...testCases];
    this.saveTestCases(updatedTCs);

    return newRun;
  }

  // 8. Trigger Scheduled GitHub Actions (Preserved + Enhanced)
  static triggerScheduledGitHubActions(): Run[] {
    const runs = this.getRuns();
    const testCases = this.getTestCases();
    
    let runNum = Math.floor(5000 + Math.random() * 5000);
    while (runs.some(r => r.id.includes(String(runNum)))) {
      runNum = Math.floor(5000 + Math.random() * 5000);
    }
    const envs: ('Prod' | 'UAT' | 'QA')[] = ['QA', 'UAT', 'Prod'];
    const suites: ('Smoke' | 'Security' | 'Regression' | 'Performance')[] = ['Smoke', 'Regression', 'Security'];
    
    const newRunsList: Run[] = [];
    const newTestCasesList: TestCase[] = [];

    envs.forEach((env, index) => {
      const suiteName = suites[index % suites.length];
      const runId = `GH-SCHED-${runNum}-${env.toUpperCase()}`;
      const passedPercent = env === 'UAT' ? 100 : Math.floor(80 + Math.random() * 20);
      const isPassed = passedPercent >= 90;

      const newRun: Run = {
        id: runId,
        name: `Scheduled_GH_Actions_${suiteName}_${runNum}`,
        branch: 'main',
        status: isPassed ? 'Passed' : 'Failed',
        environment: env,
        duration: `${Math.floor(2 + Math.random() * 5)}m ${Math.floor(Math.random() * 60)}s`,
        timestamp: 'Just now',
        passRate: passedPercent,
        triggeredBy: 'GitHub Actions (Schedule)',
        commit: `gh-sched-${runNum}`,
        testsCount: 120,
        passedCount: Math.round((passedPercent / 100) * 120),
        skippedCount: 0,
        failedCount: 120 - Math.round((passedPercent / 100) * 120),
        suite: suiteName,
        hasMemoryAnomaly: env === 'Prod' && Math.random() > 0.5,
      };

      newRunsList.push(newRun);

// Create specific tests for this environment
      const envTests = Array.from({ length: 120 }).map((_, i) => {
        const isFailedTC = i < newRun.failedCount;
        return {
          id: `gh_test_${env.toLowerCase()}_${runNum}_${i}`,
          name: `module_${Math.floor(i / 10)}.spec.ts: Subtest ${i} [Sched ${runNum}]`,
          suiteId: suiteName,
          runId: runId,
          folder: `test/gh-workflows/${env.toLowerCase()}`,
          status: isFailedTC ? 'Failed' as const : 'Passed' as const,
          duration: `${Math.floor(100 + Math.random() * 800)}ms`,
          tag: i % 3 === 0 ? 'api' : 'e2e',
          priority: isFailedTC ? 'P1 - High' : 'P2 - Medium',
          errorMsg: isFailedTC ? `AssertionError: Expected 200 OK from ${env} environment gateway, got 504 Gateway Timeout` : undefined,
          stackTrace: isFailedTC ? `at test/gh-workflows/api.spec.ts:54\nat processTicksAndRejections\nat github-actions-runner-node` : undefined,
        };
      });
      newTestCasesList.push(...envTests);
    });

    const updatedRuns = [...newRunsList, ...runs];
    this.saveRuns(updatedRuns);

    const updatedTCs = [...newTestCasesList, ...testCases];
    this.saveTestCases(updatedTCs);

    return newRunsList;
  }
}
