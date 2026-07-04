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
      const parsed = data ? JSON.parse(data) : [];
      cachedRuns = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
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
      const parsed = data ? JSON.parse(data) : [];
      cachedTestCases = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
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
      const parsed = data ? JSON.parse(data) : [];
      cachedSuites = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
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
      const parsed = data ? JSON.parse(data) : [];
      cachedAnomalies = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
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
    const activeRunsWithTests = runs.filter(r => (r?.testsCount ?? 0) > 0);
    const avgPassRate = activeRunsWithTests.length > 0 
      ? Math.round(activeRunsWithTests.reduce((sum, r) => sum + (r?.passRate ?? 0), 0) / activeRunsWithTests.length) 
      : 100;

    // Environment specific breakdown
    const qaRuns = runs.filter(r => r?.environment === 'QA');
    const uatRuns = runs.filter(r => r?.environment === 'UAT');
    const prodRuns = runs.filter(r => r?.environment === 'Prod' || r?.environment === 'PROD');

    const qaAvg = qaRuns.length > 0 ? Math.round(qaRuns.reduce((s, r) => s + (r?.passRate ?? 0), 0) / qaRuns.length) : 0;
    const uatAvg = uatRuns.length > 0 ? Math.round(uatRuns.reduce((s, r) => s + (r?.passRate ?? 0), 0) / uatRuns.length) : 0;
    const prodAvg = prodRuns.length > 0 ? Math.round(prodRuns.reduce((s, r) => s + (r?.passRate ?? 0), 0) / prodRuns.length) : 0;

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
  static async fetchLatestTestResults() {
    try {
      const res = await fetch('test_results.json?t=' + new Date().getTime());
      if (!res.ok) {
          console.warn("Could not fetch test_results.json. Ensure python tests are run.");
          return null;
      }
      const data = await res.json();
      
      const runs = this.getRuns();
      const testCases = this.getTestCases();

      if (runs.some(r => r.id === data.id)) {
          return null; // Already imported
      }
      
      const newRun: Run = {
        id: data.id || `RUN-${Date.now()}`,
        name: data.name || 'Unknown Run',
        branch: 'main',
        status: (data.passRate ?? 0) >= 90 ? 'Passed' : 'Failed',
        environment: data.environment || 'PROD',
        duration: data.duration || '0s',
        timestamp: data.timestamp || new Date().toISOString(),
        passRate: data.passRate ?? 0,
        triggeredBy: 'Manual Python Runner',
        commit: 'actual-run',
        testsCount: data.testsCount ?? 0,
        passedCount: data.passedCount ?? 0,
        skippedCount: 0,
        failedCount: data.failedCount ?? 0,
        suite: 'Akamai Suite',
        hasMemoryAnomaly: false
      };
      
      runs.unshift(newRun);
      this.saveRuns(runs);
      
      const newTestCases: TestCase[] = data.tests.map((t: any) => ({
        id: t.id,
        name: t.name,
        suiteId: 'akamai-prod',
        runId: data.id,
        folder: 'tests/',
        status: t.status === 'passed' ? 'Passed' : 'Failed',
        duration: t.duration + 'ms',
        tag: t.priority === 'High' ? 'ui' : 'api',
        priority: t.priority,
        errorMsg: t.errorMsg,
        stackTrace: undefined
      }));
      
      const updatedTCs = [...newTestCases, ...testCases];
      this.saveTestCases(updatedTCs);
      
      return newRun;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // 8. Legacy action removed
  static triggerScheduledGitHubActions(): Run[] {
    return [];
  }
}
