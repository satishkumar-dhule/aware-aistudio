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
  static async fetchStaticTelemetry(): Promise<{ success: boolean; source: string; message: string; runsCount?: number; testsCount?: number }> {
    try {
      const filePath = localStorage.getItem('aware_telemetry_file_path') || './telemetry_data.json';
      const response = await fetch(filePath, { cache: 'no-cache' });
      if (!response.ok) {
        return { 
          success: false, 
          source: 'local', 
          message: `No static telemetry file found at '${filePath}'. Operating in local storage / simulation mode.` 
        };
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && (contentType.includes('text/html') || contentType.includes('application/xhtml+xml'))) {
        return { 
          success: false, 
          source: 'local', 
          message: `File loaded from '${filePath}' is not valid telemetry data (HTML found instead of JSON). Operating in local storage / simulation mode.` 
        };
      }

      const text = await response.text();
      const trimmedText = text.trim();
      if (trimmedText.startsWith('<') || trimmedText.toLowerCase().startsWith('<!doctype')) {
        return { 
          success: false, 
          source: 'local', 
          message: `File loaded from '${filePath}' is not valid telemetry data (XML/HTML found instead of JSON). Operating in local storage / simulation mode.` 
        };
      }

      const res = this.importDatabaseBackup(text);
      if (res.success) {
        return { 
          success: true, 
          source: 'github-pages-sync', 
          message: `Statically synced successfully from '${filePath}'! Loaded ${res.importedCount?.runs || 0} runs and ${res.importedCount?.tests || 0} test cases.`,
          runsCount: res.importedCount?.runs,
          testsCount: res.importedCount?.tests
        };
      } else {
        return { 
          success: false, 
          source: 'error', 
          message: `Static file found at '${filePath}' but failed contract validation: ${res.message}` 
        };
      }
    } catch (e: any) {
      const filePath = localStorage.getItem('aware_telemetry_file_path') || './telemetry_data.json';
      return { 
        success: false, 
        source: 'error', 
        message: `Connection failed during static database synchronization from '${filePath}': ${e.message}` 
      };
    }
  }

  // 2. Strict Type Schema Guards with Automatic Repair (Self-healing mechanism)
  static validateRun(r: any): Run | null {
    if (!r || typeof r !== 'object' || !r.id) return null;
    return {
      id: String(r.id),
      name: String(r.name || `Run ${r.id}`),
      branch: String(r.branch || 'main'),
      status: (r.status === 'Passed' || r.status === 'Failed' || r.status === 'Flaky' || r.status === 'Running') ? r.status : 'Passed',
      environment: (r.environment === 'Prod' || r.environment === 'UAT' || r.environment === 'QA') ? r.environment : 'QA',
      duration: String(r.duration || '0s'),
      timestamp: String(r.timestamp || 'Unknown time'),
      passRate: typeof r.passRate === 'number' ? r.passRate : 100,
      triggeredBy: String(r.triggeredBy || 'System'),
      commit: String(r.commit || 'unknown'),
      testsCount: typeof r.testsCount === 'number' ? r.testsCount : 0,
      passedCount: typeof r.passedCount === 'number' ? r.passedCount : 0,
      skippedCount: typeof r.skippedCount === 'number' ? r.skippedCount : 0,
      failedCount: typeof r.failedCount === 'number' ? r.failedCount : 0,
      suite: (r.suite === 'Smoke' || r.suite === 'Security' || r.suite === 'Regression' || r.suite === 'Performance') ? r.suite : 'Smoke',
      hasMemoryAnomaly: !!r.hasMemoryAnomaly
    };
  }

  static validateTestCase(tc: any): TestCase | null {
    if (!tc || typeof tc !== 'object' || !tc.id) return null;
    return {
      id: String(tc.id),
      name: String(tc.name || `Test ${tc.id}`),
      suiteId: String(tc.suiteId || 'unknown'),
      runId: String(tc.runId || 'unknown'),
      folder: String(tc.folder || 'test/'),
      status: (tc.status === 'Passed' || tc.status === 'Failed' || tc.status === 'Flaky' || tc.status === 'Skipped') ? tc.status : 'Passed',
      duration: String(tc.duration || '0ms'),
      tag: String(tc.tag || 'general'),
      priority: (tc.priority === 'P0 - Critical' || tc.priority === 'P1 - High' || tc.priority === 'P2 - Medium') ? tc.priority : 'P1 - High',
      errorMsg: tc.errorMsg ? String(tc.errorMsg) : undefined,
      stackTrace: tc.stackTrace ? String(tc.stackTrace) : undefined,
      diff: tc.diff ? { expected: String(tc.diff.expected || ''), actual: String(tc.diff.actual || '') } : undefined,
      history: Array.isArray(tc.history) ? tc.history.map((h: any) => ({
        runId: String(h.runId),
        status: (h.status === 'Passed' || h.status === 'Failed' || h.status === 'Flaky') ? h.status : 'Passed',
        duration: String(h.duration || '0ms'),
        timestamp: String(h.timestamp || 'Just now')
      })) : undefined
    };
  }

  static validateSuite(s: any): Suite | null {
    if (!s || typeof s !== 'object' || !s.id) return null;
    return {
      id: String(s.id),
      name: String(s.name || `Suite ${s.id}`),
      totalTests: typeof s.totalTests === 'number' ? s.totalTests : 0,
      duration: String(s.duration || '0s'),
      stability30d: typeof s.stability30d === 'number' ? s.stability30d : 100,
      environment: (s.environment === 'Production' || s.environment === 'Staging' || s.environment === 'UAT' || s.environment === 'QA') ? s.environment : 'QA',
      category: (s.category === 'Smoke' || s.category === 'Regression' || s.category === 'Security') ? s.category : 'Smoke',
      heatmapHistory: Array.isArray(s.heatmapHistory) ? s.heatmapHistory.map((item: any) => 
        (item === 'Passed' || item === 'Failed' || item === 'Flaky' || item === 'Skipped') ? item : 'Passed'
      ) : ['Passed']
    };
  }

  // 3. Optimized Getters with Fallback Strategy & Schema Recovery
  static getRuns(): Run[] {
    if (cachedRuns) return cachedRuns;
    try {
      const stored = localStorage.getItem(RUNS_KEY);
      if (!stored) return initialRuns;
      
      const list: any[] = JSON.parse(stored);
      const seen = new Set<string>();
      const validated: Run[] = [];
      
      for (const item of list) {
        const validatedRun = this.validateRun(item);
        if (validatedRun && !seen.has(validatedRun.id)) {
          seen.add(validatedRun.id);
          validated.push(validatedRun);
        }
      }
      
      cachedRuns = validated;
      return validated;
    } catch (e) {
      console.warn("Corrupted Runs DB state parsed. Regenerating safe defaults.", e);
      cachedRuns = [...initialRuns];
      return cachedRuns;
    }
  }

  static saveRuns(runs: Run[]) {
    // Keep only the last 50 runs to auto-purge older ones and prevent storage overflow
    let safeList = [...runs];
    if (safeList.length > 50) {
      safeList = safeList.slice(0, 50);
    }
    
    const seen = new Set<string>();
    const uniqueList: Run[] = [];
    
    for (const r of safeList) {
      const validated = this.validateRun(r);
      if (validated && !seen.has(validated.id)) {
        seen.add(validated.id);
        uniqueList.push(validated);
      }
    }
    
    cachedRuns = uniqueList;
    this.saveRunsRaw(uniqueList);
  }

  private static saveRunsRaw(runs: Run[]) {
    try {
      localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
      window.dispatchEvent(new Event('aware_db_update'));
    } catch (err) {
      console.error("Critical: Failed to save runs to localStorage.", err);
    }
  }

  static getTestCases(): TestCase[] {
    if (cachedTestCases) return cachedTestCases;
    try {
      const stored = localStorage.getItem(TEST_CASES_KEY);
      if (!stored) return initialTestCases;
      
      const list: any[] = JSON.parse(stored);
      const seen = new Set<string>();
      const validated: TestCase[] = [];
      
      for (const item of list) {
        const validatedTC = this.validateTestCase(item);
        if (validatedTC && !seen.has(validatedTC.id)) {
          seen.add(validatedTC.id);
          validated.push(validatedTC);
        }
      }
      
      cachedTestCases = validated;
      return validated;
    } catch (e) {
      console.warn("Corrupted TestCases DB state parsed. Fallback safe defaults.", e);
      cachedTestCases = [...initialTestCases];
      return cachedTestCases;
    }
  }

  static saveTestCases(testCases: TestCase[]) {
    // Keep up to 10000 test cases for full suite runs
    let safeList = [...testCases];
    if (safeList.length > 10000) {
      safeList = safeList.slice(0, 10000);
    }
    
    const seen = new Set<string>();
    const uniqueList: TestCase[] = [];
    
    for (const tc of safeList) {
      const validated = this.validateTestCase(tc);
      if (validated && !seen.has(validated.id)) {
        seen.add(validated.id);
        uniqueList.push(validated);
      }
    }
    
    cachedTestCases = uniqueList;
    this.saveTestCasesRaw(uniqueList);
  }

  private static saveTestCasesRaw(testCases: TestCase[]) {
    try {
      localStorage.setItem(TEST_CASES_KEY, JSON.stringify(testCases));
      window.dispatchEvent(new Event('aware_db_update'));
    } catch (err) {
      console.error("Critical: Failed to save test cases.", err);
    }
  }

  static getSuites(): Suite[] {
    if (cachedSuites) return cachedSuites;
    try {
      const stored = localStorage.getItem(SUITES_KEY);
      if (!stored) return initialSuites;
      
      const list: any[] = JSON.parse(stored);
      const validated: Suite[] = [];
      for (const item of list) {
        const val = this.validateSuite(item);
        if (val) validated.push(val);
      }
      cachedSuites = validated;
      return validated;
    } catch {
      cachedSuites = [...initialSuites];
      return cachedSuites;
    }
  }

  static saveSuites(suites: Suite[]) {
    cachedSuites = suites;
    this.saveSuitesRaw(suites);
  }

  private static saveSuitesRaw(suites: Suite[]) {
    try {
      localStorage.setItem(SUITES_KEY, JSON.stringify(suites));
      window.dispatchEvent(new Event('aware_db_update'));
    } catch (err) {
      console.error("Critical: Failed to save suites.", err);
    }
  }

  static getAnomalies(): typeof activeAnomalies {
    if (cachedAnomalies) return cachedAnomalies;
    try {
      const stored = localStorage.getItem(ANOMALIES_KEY);
      if (!stored) return activeAnomalies;
      cachedAnomalies = JSON.parse(stored);
      return cachedAnomalies || activeAnomalies;
    } catch {
      cachedAnomalies = [...activeAnomalies];
      return cachedAnomalies;
    }
  }

  static saveAnomalies(anomalies: typeof activeAnomalies) {
    cachedAnomalies = anomalies;
    this.saveAnomaliesRaw(anomalies);
  }

  private static saveAnomaliesRaw(anomalies: typeof activeAnomalies) {
    try {
      localStorage.setItem(ANOMALIES_KEY, JSON.stringify(anomalies));
      window.dispatchEvent(new Event('aware_db_update'));
    } catch (err) {
      console.error("Critical: Failed to save anomalies.", err);
    }
  }

  // 4. Central Reset Engine with Cache Purge
  static resetDatabase() {
    cachedRuns = null;
    cachedTestCases = null;
    cachedSuites = null;
    cachedAnomalies = null;
    
    this.saveRunsRaw(initialRuns);
    this.saveTestCasesRaw(initialTestCases);
    this.saveSuitesRaw(initialSuites);
    this.saveAnomaliesRaw(activeAnomalies);
  }

  // 5. Database Backup and Restore Suite (Export/Import JSON)
  static exportDatabaseBackup(): string {
    const backupObj = {
      version: "1.2.0-secure",
      timestamp: new Date().toISOString(),
      runs: this.getRuns(),
      testCases: this.getTestCases(),
      suites: this.getSuites(),
      anomalies: this.getAnomalies()
    };
    return JSON.stringify(backupObj, null, 2);
  }

  static importDatabaseBackup(jsonString: string): { success: boolean; message: string; importedCount?: { runs: number; tests: number } } {
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
        status: isFailedTC ? 'Failed' : 'Passed',
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
      newTestCasesList.push(
        {
          id: `gh_test_api_${env.toLowerCase()}_${runNum}`,
          name: `api.v1.${env.toLowerCase()}.spec.ts: Gateway Security Health [Sched ${runNum}]`,
          suiteId: 'prd-smk-01',
          runId: runId,
          folder: `test/gh-workflows/${env.toLowerCase()}`,
          status: isPassed ? 'Passed' : 'Failed',
          duration: '1.8s',
          tag: 'api',
          priority: 'P0 - Critical',
          errorMsg: isPassed ? undefined : `AssertionError: Expected 200 OK from ${env} environment gateway, got 504 Gateway Timeout`,
          stackTrace: isPassed ? undefined : `at test/gh-workflows/api.spec.ts:54\nat processTicksAndRejections\nat github-actions-runner-node`,
        },
        {
          id: `gh_test_e2e_${env.toLowerCase()}_${runNum}`,
          name: `e2e.flow.${env.toLowerCase()}.spec.ts: User Checkpoint [Sched ${runNum}]`,
          suiteId: 'prd-smk-01',
          runId: runId,
          folder: `test/gh-workflows/${env.toLowerCase()}`,
          status: 'Passed',
          duration: '5.2s',
          tag: 'e2e',
          priority: 'P1 - High',
        }
      );
    });

    const updatedRuns = [...newRunsList, ...runs];
    this.saveRuns(updatedRuns);

    const updatedTCs = [...newTestCasesList, ...testCases];
    this.saveTestCases(updatedTCs);

    return newRunsList;
  }
}
