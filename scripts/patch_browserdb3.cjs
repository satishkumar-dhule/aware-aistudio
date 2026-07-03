const fs = require('fs');

const file = 'src/lib/browserDb.ts';
let code = fs.readFileSync(file, 'utf8');

const missingMethods2 = `
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
`;

code = code.replace(`static async fetchStaticTelemetry()`, missingMethods2 + `\n  static async fetchStaticTelemetry()`);

fs.writeFileSync(file, code);
