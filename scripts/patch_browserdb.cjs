const fs = require('fs');

const file = 'src/lib/browserDb.ts';
let code = fs.readFileSync(file, 'utf8');

code = `import initSqlJs from 'sql.js';\n` + code;

const fetchReplacement = `static async fetchStaticTelemetry(): Promise<{ success: boolean; source: string; message: string; runsCount?: number; testsCount?: number }> {
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
           message: \`No SQLite telemetry file found at '\${filePath}'.\` 
         };
      }
      
      const buffer = await response.arrayBuffer();
      
      const SQL = await initSqlJs({ locateFile: file => \`https://sql.js.org/dist/\${file}\` });
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
         message: \`SQLite synced successfully from '\${filePath}'! Loaded \${runs.length} runs and \${testCases.length} test cases.\`,
         runsCount: runs.length,
         testsCount: testCases.length
      };

    } catch (e: any) {
      return { 
         success: false, 
         source: 'error', 
         message: \`Static SQLite sync failed: \${e.message}\`
       };
    }
  }`;

code = code.replace(/static async fetchStaticTelemetry\(\)[\s\S]*?(?=static importDatabaseBackup)/, fetchReplacement);
fs.writeFileSync(file, code);
