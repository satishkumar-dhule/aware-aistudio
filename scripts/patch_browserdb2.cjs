const fs = require('fs');

const file = 'src/lib/browserDb.ts';
let code = fs.readFileSync(file, 'utf8');

const missingMethods = `
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

`;

code = code.replace(`static async fetchStaticTelemetry()`, missingMethods + `static async fetchStaticTelemetry()`);

fs.writeFileSync(file, code);
