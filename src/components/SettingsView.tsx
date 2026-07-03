import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Sparkles, 
  Database, 
  Terminal, 
  RefreshCw, 
  Sliders,
  ShieldCheck,
  Check,
  Trash2,
  PlusCircle,
  Activity,
  Download,
  Upload,
  Wrench,
  Code,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Clipboard,
  BookOpen
} from 'lucide-react';
import { BrowserDb } from '../lib/browserDb';

interface SettingsViewProps {
  onRefreshData?: () => void;
  simulationMode: boolean;
  onToggleSimulation: () => void;
  syncResult?: { success: boolean; source: string; message: string; runsCount?: number; testsCount?: number } | null;
  lastSyncTime?: Date | null;
  isSyncing?: boolean;
  onForceSync?: () => void;
  telemetryFilePath?: string;
  pollRate?: number;
  isSyncEnabled?: boolean;
  onUpdateConfig?: (path: string, rate: number, enabled: boolean) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function SettingsView({ 
  onRefreshData,
  simulationMode,
  onToggleSimulation,
  syncResult = null,
  lastSyncTime = null,
  isSyncing = false,
  onForceSync,
  telemetryFilePath = './telemetry_data.json',
  pollRate = 15000,
  isSyncEnabled = true,
  onUpdateConfig,
  onShowToast
}: SettingsViewProps) {
  const [dbStats, setDbStats] = useState({
    runs: 0,
    tests: 0,
    anomalies: 0
  });
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Advanced telemetry integration states
  const [localFilePath, setLocalFilePath] = useState(telemetryFilePath);
  const [localPollRate, setLocalPollRate] = useState(pollRate);
  const [localSyncEnabled, setLocalSyncEnabled] = useState(isSyncEnabled);
  const [activeRunner, setActiveRunner] = useState<'playwright' | 'cypress' | 'vitest_jest'>('playwright');

  useEffect(() => {
    setLocalFilePath(telemetryFilePath);
    setLocalPollRate(pollRate);
    setLocalSyncEnabled(isSyncEnabled);
  }, [telemetryFilePath, pollRate, isSyncEnabled]);

  const [contractTab, setContractTab] = useState<'schema' | 'sample' | 'playground' | 'yaml' | 'pages'>('schema');
  const [playgroundText, setPlaygroundText] = useState<string>(`{
  "version": "1.2.0-secure",
  "runs": [
    {
      "id": "GH-RUN-1092-QA",
      "name": "Regression_Suite_Run_1092",
      "branch": "main",
      "status": "Passed",
      "environment": "QA",
      "duration": "2m 15s",
      "timestamp": "2026-07-02T02:15:00Z",
      "passRate": 100,
      "triggeredBy": "GitHub Actions",
      "commit": "8f3b29a",
      "testsCount": 8,
      "passedCount": 8,
      "skippedCount": 0,
      "failedCount": 0,
      "suite": "Regression"
    }
  ],
  "testCases": [
    {
      "id": "test_register_flow_1092",
      "name": "registration.spec.ts: Successful user sign up",
      "suiteId": "prd-smk-01",
      "runId": "GH-RUN-1092-QA",
      "folder": "src/components/auth",
      "status": "Passed",
      "duration": "820ms",
      "tag": "auth",
      "priority": "P1 - High"
    }
  ]
}`);
  const [playgroundResult, setPlaygroundResult] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handlePlaygroundValidate = () => {
    try {
      const parsed = JSON.parse(playgroundText);
      const errors: string[] = [];
      if (!parsed || typeof parsed !== 'object') {
        setPlaygroundResult({ valid: false, errors: ["Root payload must be a valid JSON Object"] });
        return;
      }
      
      if (parsed.runs && !Array.isArray(parsed.runs)) {
        errors.push("Property 'runs' must be an array of Run objects");
      } else if (parsed.runs) {
        parsed.runs.forEach((r: any, idx: number) => {
          if (!r.id) errors.push(`runs[${idx}] error: 'id' is required`);
          if (!r.name) errors.push(`runs[${idx}] error: 'name' is required`);
          if (r.status && !['Passed', 'Failed', 'Flaky', 'Running'].includes(r.status)) {
            errors.push(`runs[${idx}] error: 'status' must be 'Passed' | 'Failed' | 'Flaky' | 'Running'`);
          }
          if (r.environment && !['Prod', 'UAT', 'QA'].includes(r.environment)) {
            errors.push(`runs[${idx}] error: 'environment' must be 'Prod' | 'UAT' | 'QA'`);
          }
          if (r.suite && !['Smoke', 'Security', 'Regression', 'Performance'].includes(r.suite)) {
            errors.push(`runs[${idx}] error: 'suite' must be 'Smoke' | 'Security' | 'Regression' | 'Performance'`);
          }
        });
      }

      if (parsed.testCases && !Array.isArray(parsed.testCases)) {
        errors.push("Property 'testCases' must be an array of TestCase objects");
      } else if (parsed.testCases) {
        parsed.testCases.forEach((tc: any, idx: number) => {
          if (!tc.id) errors.push(`testCases[${idx}] error: 'id' is required`);
          if (!tc.name) errors.push(`testCases[${idx}] error: 'name' is required`);
          if (tc.status && !['Passed', 'Failed', 'Flaky', 'Skipped'].includes(tc.status)) {
            errors.push(`testCases[${idx}] error: 'status' must be 'Passed' | 'Failed' | 'Flaky' | 'Skipped'`);
          }
        });
      }

      if (errors.length > 0) {
        setPlaygroundResult({ valid: false, errors });
      } else {
        setPlaygroundResult({ valid: true, errors: [] });
      }
    } catch (err: any) {
      setPlaygroundResult({ valid: false, errors: [`JSON Syntax Error: ${err.message}`] });
    }
  };

  const handlePlaygroundImport = () => {
    const res = BrowserDb.importDatabaseBackup(playgroundText);
    if (res.success) {
      setImportSuccess("Successfully imported validated payload from playground!");
      setTimeout(() => setImportSuccess(null), 5000);
    } else {
      setImportError(res.message);
      setTimeout(() => setImportError(null), 5000);
    }
  };

  const handleDownloadTemplate = () => {
    const template = {
      version: "1.2.0-secure",
      runs: [
        {
          id: "GH-RUN-1092-QA",
          name: "Regression_Suite_Run_1092",
          branch: "main",
          status: "Passed",
          environment: "QA",
          duration: "2m 15s",
          timestamp: new Date().toISOString(),
          passRate: 100,
          triggeredBy: "GitHub Actions",
          commit: "8f3b29a",
          testsCount: 1,
          passedCount: 1,
          skippedCount: 0,
          failedCount: 0,
          suite: "Regression",
          hasMemoryAnomaly: false
        }
      ],
      testCases: [
        {
          id: "test_register_flow_1092",
          name: "registration.spec.ts: Successful user sign up",
          suiteId: "prd-smk-01",
          runId: "GH-RUN-1092-QA",
          folder: "src/components/auth",
          status: "Passed",
          duration: "820ms",
          tag: "auth",
          priority: "P1 - High"
        }
      ]
    };
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "aware_github_actions_contract_template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadStats = () => {
    setDbStats({
      runs: BrowserDb.getRuns().length,
      tests: BrowserDb.getTestCases().length,
      anomalies: BrowserDb.getAnomalies().length
    });
  };

  useEffect(() => {
    loadStats();
    window.addEventListener('aware_db_update', loadStats);
    return () => window.removeEventListener('aware_db_update', loadStats);
  }, []);

  const handleResetDb = () => {
    BrowserDb.resetDatabase();
    setShowResetConfirm(false);
    onShowToast?.("Browser database has been successfully reset!", "success");
  };

  const handleAddSimulatedRun = () => {
    const newRun = BrowserDb.addRandomSimulatedRun();
    onShowToast?.(`Generated simulated pipeline run: ${newRun.id} (${newRun.name}) in ${newRun.environment}!`, "success");
  };

  const handleRunDiagnostics = () => {
    // Read and enforce validation/self-healing schemas over existing collections
    const runs = BrowserDb.getRuns();
    const tests = BrowserDb.getTestCases();
    const suites = BrowserDb.getSuites();
    
    BrowserDb.saveRuns(runs);
    BrowserDb.saveTestCases(tests);
    BrowserDb.saveSuites(suites);
    
    onShowToast?.(`Diagnostics Complete! Evaluated ${runs.length} runs and verified database schema compatibility.`, "success");
  };

  const handleExportBackup = () => {
    try {
      const payload = BrowserDb.exportDatabaseBackup();
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aware_telemetry_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast?.("Telemetry database backup exported successfully!", "success");
    } catch (e: any) {
      onShowToast?.(`Export failed: ${e.message}`, "error");
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const res = BrowserDb.importDatabaseBackup(content);
        if (res.success) {
          setImportSuccess(res.message);
          setTimeout(() => setImportSuccess(null), 5000);
        } else {
          setImportError(res.message);
        }
      }
    };
    reader.onerror = () => {
      setImportError("Failed to read selected file stream.");
    };
    reader.readAsText(file);
    // Reset uploader value so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0c0c0c] select-none font-sans">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Settings & Configuration</h2>
        <p className="text-zinc-500 text-xs mt-1">Configure workspace variables, clear browser cache schemas, and trigger automated telemetry simulations.</p>
      </div>

      {/* GitHub Pages Sync Status Banner */}
      {syncResult && (
        <div className={`p-4 rounded border text-xs font-sans flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in ${
          syncResult.success 
            ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300' 
            : syncResult.source === 'local' 
              ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400' 
              : 'bg-amber-950/20 border-amber-900/40 text-amber-300'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded shrink-0 ${
              syncResult.success ? 'bg-emerald-900/30' : 'bg-zinc-900'
            }`}>
              {syncResult.success ? (
                <CheckCircle2 size={16} className={`text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
              ) : (
                <BookOpen size={16} className="text-zinc-400" />
              )}
            </div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                {syncResult.success ? (
                  <>
                    <span className={`h-1.5 w-1.5 rounded-full bg-emerald-400 ${isSyncing ? 'animate-ping' : 'animate-pulse'}`}></span>
                    GitHub Pages Sync Active (AJAX Polling Every 15s)
                  </>
                ) : (
                  'Local Sandbox / Simulated Mode'
                )}
              </h4>
              <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">
                {syncResult.message}
              </p>
              {syncResult.success && lastSyncTime && (
                <p className="text-[10px] text-emerald-400/70 mt-1 font-mono">
                  ● Last Checked: {lastSyncTime.toLocaleTimeString()} {isSyncing ? '(fetching fresh logs...)' : '(up to date)'}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {onForceSync && (
              <button
                onClick={onForceSync}
                disabled={isSyncing}
                className={`px-3 py-1.5 rounded font-mono text-[9px] uppercase font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  syncResult.success 
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-400' 
                    : 'bg-[#4daeff] hover:bg-[#4daeff]/80 text-black border border-[#4daeff]'
                }`}
              >
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                <span className={`${isSyncing ? 'animate-spin' : ''}`}>⟳</span>
              </button>
            )}
            <button
              onClick={() => setContractTab('pages')}
              className={`px-3 py-1.5 rounded font-mono text-[9px] uppercase font-bold transition-all cursor-pointer ${
                syncResult.success 
                  ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/50' 
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              Setup Pages Integration Guide
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Workspace Telemetry Simulator & Database Seeder */}
        <div className="bg-[#131313] border border-[#262626] rounded p-5 space-y-4 col-span-1 md:col-span-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Database size={16} className="text-[#4daeff]" /> Browser Database Control Plane
          </h3>
          <p className="text-xs text-zinc-400 leading-normal">
            AWARE uses a robust, reactive client-side database layer mapped to Local/IndexedDB. You can trigger simulated pipeline cycles to immediately test responsive UI graphs, details, anomalies, and Chrome AI RAG diagnostics.
          </p>

          {/* Database stats banner */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-[#0d0d0d] border border-zinc-800 rounded">
            <div className="text-center py-2">
              <span className="text-[10px] text-zinc-500 block uppercase font-mono">Telemetry Runs</span>
              <strong className="text-lg font-mono text-[#4daeff] mt-1 block">{dbStats.runs}</strong>
            </div>
            <div className="text-center py-2 border-x border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase font-mono">Test Cases</span>
              <strong className="text-lg font-mono text-white mt-1 block">{dbStats.tests}</strong>
            </div>
            <div className="text-center py-2">
              <span className="text-[10px] text-zinc-500 block uppercase font-mono">Active Anomalies</span>
              <strong className="text-lg font-mono text-red-400 mt-1 block">{dbStats.anomalies}</strong>
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center p-3 rounded border border-zinc-800 bg-[#0d0d0d] text-xs">
              <div>
                <span className="font-semibold text-zinc-200 block flex items-center gap-1.5">
                  <Activity size={12} className="text-emerald-500 animate-pulse" /> Automatic Telemetry Stream
                </span>
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">Applies random live updates and anomalies dynamically</span>
              </div>
              <button 
                onClick={onToggleSimulation}
                className={`px-3 py-1.5 rounded font-mono text-[9px] uppercase font-bold transition-all ${
                  simulationMode 
                    ? 'bg-[#81c784] text-black' 
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {simulationMode ? 'ACTIVE' : 'INACTIVE'}
              </button>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleAddSimulatedRun}
                className="flex-1 py-2.5 bg-[#4daeff]/10 hover:bg-[#4daeff]/20 text-[#4daeff] border border-[#4daeff]/30 rounded font-mono text-[10px] uppercase font-bold transition-all flex justify-center items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle size={13} /> Generate Simulated Run
              </button>
              
              {!showResetConfirm ? (
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="py-2.5 px-4 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/40 rounded font-mono text-[10px] uppercase font-bold transition-all flex justify-center items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} /> Reset Database
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-[#171717] px-2 py-1 rounded border border-red-900/30">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold">Reset DB?</span>
                  <button 
                    onClick={handleResetDb}
                    className="py-1.5 px-2.5 bg-red-800 hover:bg-red-700 text-white rounded font-mono text-[9px] uppercase font-bold transition-all cursor-pointer"
                  >
                    Yes, Reset
                  </button>
                  <button 
                    onClick={() => setShowResetConfirm(false)}
                    className="py-1.5 px-2 text-zinc-500 hover:text-zinc-300 font-mono text-[9px] uppercase font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enterprise Diagnostics, Export & Import */}
        <div className="bg-[#131313] border border-[#262626] rounded p-5 space-y-4 col-span-1 md:col-span-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Wrench size={16} className="text-[#4daeff]" /> Data Layer Integrity, Backups & Verification
          </h3>
          <p className="text-xs text-zinc-400 leading-normal">
            Enforce self-healing schemas, eliminate redundant caches, and execute manual transaction validations to stabilize the underlying telemetry tables. Download a full local state snapshot or restore your environment easily.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Run Diagnostics */}
            <button 
              onClick={handleRunDiagnostics}
              className="py-2.5 bg-[#161616] hover:bg-[#1f1f1f] text-zinc-200 border border-zinc-800 hover:border-zinc-700 rounded font-mono text-[10px] uppercase font-bold transition-all flex justify-center items-center gap-1.5 cursor-pointer"
            >
              <Wrench size={12} className="text-[#4daeff]" /> Self-Healing Check
            </button>

            {/* Export Backup */}
            <button 
              onClick={handleExportBackup}
              className="py-2.5 bg-[#161616] hover:bg-[#1f1f1f] text-zinc-200 border border-zinc-800 hover:border-zinc-700 rounded font-mono text-[10px] uppercase font-bold transition-all flex justify-center items-center gap-1.5 cursor-pointer"
            >
              <Download size={12} className="text-emerald-400" /> Export Backup
            </button>

            {/* Import Backup Trigger */}
            <label 
              className="py-2.5 bg-[#161616] hover:bg-[#1f1f1f] text-zinc-200 border border-zinc-800 hover:border-zinc-700 rounded font-mono text-[10px] uppercase font-bold transition-all flex justify-center items-center gap-1.5 cursor-pointer text-center"
            >
              <Upload size={12} className="text-amber-400" /> Import Backup
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportFile} 
                className="hidden" 
              />
            </label>
          </div>

          {importSuccess && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded text-xs text-emerald-400 font-mono">
              ✓ {importSuccess}
            </div>
          )}

          {importError && (
            <div className="p-3 bg-red-950/20 border border-red-900/40 rounded text-xs text-red-400 font-mono">
              ⚠️ {importError}
            </div>
          )}
        </div>

        {/* GitHub Actions Scheduler Integration Block */}
        <div className="bg-[#131313] border border-[#262626] rounded p-5 space-y-4 col-span-1 md:col-span-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Terminal size={16} className="text-[#a855f7]" /> GitHub Actions Scheduler Monitor
          </h3>
          <p className="text-xs text-zinc-400 leading-normal">
            Your testing workflows are scheduled in GitHub Actions to run automatically on all environments (<span className="text-[#4daeff] font-mono font-bold">QA</span>, <span className="text-amber-400 font-mono font-bold">UAT</span>, and <span className="text-rose-500 font-mono font-bold">Prod</span>). AWARE integrates with your pipeline metrics to aggregate cross-environment health instantly.
          </p>

          <div className="p-3.5 bg-[#0d0d0d] border border-zinc-800 rounded flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#a855f7] animate-pulse animate-[pulse_2s_infinite]"></span>
                <span className="text-xs font-semibold text-zinc-200">Cron Trigger: <code className="text-[#a855f7] font-mono text-[11px] bg-purple-950/20 px-1.5 py-0.5 rounded border border-purple-900/30">30 */6 * * *</code> (Every 6 Hours)</span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Executes the complete test matrix across QA, UAT, and PROD</p>
            </div>
            
            <button
              onClick={() => {
                const newRuns = BrowserDb.triggerScheduledGitHubActions();
                onShowToast?.(`Simulated GitHub Actions Scheduler Run! Instantiated ${newRuns.length} concurrent pipeline runs across all envs.`, "success");
              }}
              className="px-4 py-2 bg-[#a855f7]/10 hover:bg-[#a855f7]/25 text-[#a855f7] border border-[#a855f7]/30 hover:border-[#a855f7]/60 rounded font-mono text-[10px] uppercase font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw size={12} /> Force Run Scheduled Tests (All Envs)
            </button>
          </div>
        </div>

        {/* CI/CD Telemetry Schema & Data Contract Specification Explorer */}
        <div className="col-span-1 md:col-span-2 bg-[#131313] border border-[#262626] rounded p-5 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#262626] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database size={16} className="text-[#4daeff]" /> CI/CD & GitHub Actions Data Contract Specification
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-normal">
                Define, copy, and validate the JSON schema formats emitted by backend test runners for direct ingestion.
              </p>
            </div>
            
            <div className="flex bg-[#0c0c0c] border border-zinc-800 p-0.5 rounded text-[10px] font-mono shrink-0 overflow-x-auto max-w-full">
              <button 
                onClick={() => setContractTab('schema')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer whitespace-nowrap ${contractTab === 'schema' ? 'bg-[#1c1c1c] text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Schema Specs
              </button>
              <button 
                onClick={() => setContractTab('sample')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer whitespace-nowrap ${contractTab === 'sample' ? 'bg-[#1c1c1c] text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Sample JSON
              </button>
              <button 
                onClick={() => setContractTab('playground')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer whitespace-nowrap ${contractTab === 'playground' ? 'bg-[#1c1c1c] text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Live Validator
              </button>
              <button 
                onClick={() => setContractTab('yaml')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer whitespace-nowrap ${contractTab === 'yaml' ? 'bg-[#1c1c1c] text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                GitHub YAML
              </button>
              <button 
                onClick={() => setContractTab('pages')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer whitespace-nowrap ${contractTab === 'pages' ? 'bg-[#1c1c1c] text-[#4daeff] font-bold border border-[#4daeff]/20' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                GitHub Pages Setup
              </button>
            </div>
          </div>

          {contractTab === 'schema' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Run Contract */}
                <div className="p-4 bg-[#0a0a0a] border border-zinc-900 rounded space-y-2.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#4daeff] bg-[#4daeff]/10 px-1.5 py-0.5 rounded">Run Data Contract</span>
                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">id</span>
                      <span className="text-zinc-500">string (e.g. "GH-RUN-101")</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">name</span>
                      <span className="text-zinc-500">string</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">status</span>
                      <span className="text-[#81c784] font-bold">"Passed" | "Failed" | "Flaky" | "Running"</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">environment</span>
                      <span className="text-amber-400 font-bold">"Prod" | "UAT" | "QA"</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">passRate</span>
                      <span className="text-zinc-500">number (0 - 100)</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">suite</span>
                      <span className="text-indigo-400 font-bold">"Smoke" | "Security" | "Regression" | "Performance"</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">commit</span>
                      <span className="text-zinc-500">string (7-char SHA)</span>
                    </div>
                  </div>
                </div>

                {/* TestCase Contract */}
                <div className="p-4 bg-[#0a0a0a] border border-zinc-900 rounded space-y-2.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#a855f7] bg-[#a855f7]/10 px-1.5 py-0.5 rounded">TestCase Data Contract</span>
                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">id</span>
                      <span className="text-zinc-500">string (unique test uuid)</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">name</span>
                      <span className="text-zinc-500">string</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">runId</span>
                      <span className="text-zinc-500">string (matching parent id)</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">status</span>
                      <span className="text-[#81c784] font-bold">"Passed" | "Failed" | "Flaky" | "Skipped"</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">priority</span>
                      <span className="text-zinc-500">"P0 - Critical" | "P1 - High" | "P2 - Medium"</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">tag</span>
                      <span className="text-zinc-500">string (e.g. "auth", "checkout")</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1 font-mono text-[11px]">
                      <span className="text-zinc-300 font-bold">errorMsg</span>
                      <span className="text-zinc-500">string (optional failure log)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded flex items-center gap-2.5 text-zinc-400 text-[11px]">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>The system automatically enforces deep schema typing, removing invalid parameters and protecting the visualization database from corruption.</span>
              </div>
            </div>
          )}

          {contractTab === 'sample' && (
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>COMPLIANT JSON PAYLOAD SCHEMATICS</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => copyToClipboard(playgroundText)}
                    className="hover:text-white px-2 py-0.5 bg-zinc-900 rounded border border-zinc-800 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Clipboard size={10} /> {copiedText ? "Copied!" : "Copy Payload"}
                  </button>
                  <button 
                    onClick={handleDownloadTemplate}
                    className="hover:text-white px-2 py-0.5 bg-zinc-900 rounded border border-zinc-800 flex items-center gap-1 cursor-pointer transition-colors text-[#4daeff] border-[#4daeff]/20"
                  >
                    <Download size={10} /> Download Template
                  </button>
                </div>
              </div>

              <div className="bg-[#0c0c0c] border border-zinc-900 rounded p-4 font-mono text-[11px] text-[#81c784] whitespace-pre overflow-x-auto select-all leading-normal max-h-[220px]">
                {playgroundText}
              </div>
            </div>
          )}

          {contractTab === 'playground' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Payload Input Field</label>
                <textarea 
                  value={playgroundText}
                  onChange={(e) => {
                    setPlaygroundText(e.target.value);
                    setPlaygroundResult(null);
                  }}
                  className="w-full h-[180px] bg-[#0c0c0c] text-[#81c784] font-mono text-[11px] p-3 border border-zinc-800 rounded focus:outline-none focus:border-zinc-700 leading-normal"
                  placeholder="Paste your JSON payload here..."
                />
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={handlePlaygroundValidate}
                  className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#252525] text-white border border-zinc-800 rounded font-mono text-[10px] uppercase font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={12} className="text-[#4daeff]" /> Validate Schema Contract
                </button>
                {playgroundResult?.valid && (
                  <button 
                    onClick={handlePlaygroundImport}
                    className="px-4 py-2 bg-emerald-950/30 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 rounded font-mono text-[10px] uppercase font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={12} /> Inject Validated Runs into App
                  </button>
                )}
              </div>

              {playgroundResult && (
                <div className={`p-4 rounded border text-xs font-mono space-y-1.5 animate-fade-in ${playgroundResult.valid ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400' : 'bg-red-950/20 border-red-900/40 text-red-400'}`}>
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    {playgroundResult.valid ? (
                      <>
                        <CheckCircle2 size={13} /> Contract Verification Succeeded
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={13} /> Contract Verification Failed
                      </>
                    )}
                  </div>
                  {playgroundResult.valid ? (
                    <p className="text-[11px] opacity-90 leading-relaxed">✓ The telemetry payload conforms perfectly to AWARE's database schema. You can integrate this payload production-wide safely.</p>
                  ) : (
                    <ul className="list-disc list-inside text-[11px] space-y-1 pl-0.5">
                      {playgroundResult.errors.map((err, idx) => (
                        <li key={idx} className="leading-relaxed">{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {contractTab === 'yaml' && (
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>GITHUB ACTIONS WORKFLOW EXAMPLE (.GITHUB/WORKFLOWS/AWARE-REPORT.YML)</span>
                <button 
                  onClick={() => copyToClipboard(`name: AWARE Test Report Pipeline\non:\n  push:\n    branches: [ main ]\njobs:\n  report-telemetry:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - name: Create Payload\n        run: |\n          echo '{"version":"1.2.0-secure","runs":[{"id":"RUN-GITHUB-1","name":"Smoke_Pipeline","branch":"main","status":"Passed","environment":"QA","duration":"40s","passRate":100,"triggeredBy":"CI","commit":"\\\${{ github.sha }}","testsCount":1,"passedCount":1,"skippedCount":0,"failedCount":0,"suite":"Smoke"}]}' > telemetry.json\n`)}
                  className="hover:text-white px-2 py-0.5 bg-zinc-900 rounded border border-zinc-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Clipboard size={10} /> {copiedText ? "Copied!" : "Copy YAML"}
                </button>
              </div>

              <div className="bg-[#0c0c0c] border border-zinc-900 rounded p-4 font-mono text-[11px] text-zinc-300 space-y-2 whitespace-pre overflow-x-auto select-all leading-relaxed max-h-[220px]">
                <div><span className="text-[#a855f7]">name:</span> AWARE Test Report Pipeline</div>
                <div><span className="text-[#a855f7]">on:</span></div>
                <div>  <span className="text-[#a855f7]">push:</span></div>
                <div>    <span className="text-[#a855f7]">branches:</span> [ main ]</div>
                <div><span className="text-[#a855f7]">jobs:</span></div>
                <div>  <span className="text-[#a855f7]">report-telemetry:</span></div>
                <div>    <span className="text-[#a855f7]">runs-on:</span> ubuntu-latest</div>
                <div>    <span className="text-[#a855f7]">steps:</span></div>
                <div>      - <span className="text-[#a855f7]">uses:</span> actions/checkout@v3</div>
                <div>      - <span className="text-[#a855f7]">name:</span> Execute Node Test Script</div>
                <div>        <span className="text-[#a855f7]">run:</span> npm ci && npm test</div>
                <div>      - <span className="text-[#a855f7]">name:</span> Assemble & Upload Telemetry</div>
                <div>        <span className="text-[#a855f7]">run:</span> |</div>
                <div>{"          # Generate compliant contract report template"}</div>
                <div>{"          echo '{"}</div>
                <div>{"            \"version\": \"1.2.0-secure\","}</div>
                <div>{"            \"runs\": ["}</div>
                <div>{"              { \"id\": \"GH-${{ github.run_id }}\", \"name\": \"Build_${{ github.run_number }}\", \"branch\": \"${{ github.ref_name }}\", \"status\": \"Passed\", \"environment\": \"QA\", \"passRate\": 100, \"triggeredBy\": \"GitHub Actions\", \"commit\": \"${{ github.sha }}\", \"testsCount\": 10, \"passedCount\": 10, \"failedCount\": 0, \"suite\": \"Regression\" }"}</div>
                <div>{"            ]"}</div>
                <div>{"          }' > telemetry_report.json"}</div>
              </div>
            </div>
          )}

          {contractTab === 'pages' && (
            <div className="space-y-6 animate-fade-in text-xs leading-relaxed text-zinc-300">
              
              {/* Configuration Panel */}
              <div className="p-5 bg-[#0a0a0a] border border-zinc-900 rounded-lg space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders size={16} className="text-[#4daeff]" /> 
                    <span>Live Telemetry Integration Parameters</span>
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                    localSyncEnabled ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  }`}>
                    {localSyncEnabled ? 'POLLING ACTIVE' : 'POLLING DISABLED'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* File path Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 font-bold uppercase block">Static Target Endpoint / File Path</label>
                    <input 
                      type="text"
                      value={localFilePath}
                      onChange={(e) => setLocalFilePath(e.target.value)}
                      placeholder="./telemetry_data.json"
                      className="w-full bg-[#121212] border border-zinc-800 focus:border-[#4daeff]/60 rounded px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none transition-all"
                    />
                    <p className="text-[9px] text-zinc-500">Relative file path or absolute endpoint hosting your test output JSON.</p>
                  </div>

                  {/* Polling Rate Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 font-bold uppercase block">AJAX Background Polling Interval</label>
                    <select
                      value={localPollRate}
                      onChange={(e) => setLocalPollRate(Number(e.target.value))}
                      className="w-full bg-[#121212] border border-zinc-800 focus:border-[#4daeff]/60 rounded px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="5000">5 seconds (High Frequency)</option>
                      <option value="15000">15 seconds (Standard)</option>
                      <option value="30000">30 seconds (Relaxed)</option>
                      <option value="60000">60 seconds (Hourly/Saver)</option>
                      <option value="0">0 (Manual Sync Only)</option>
                    </select>
                    <p className="text-[9px] text-zinc-500">How often the client issues background fetches to reload fresh logs.</p>
                  </div>

                  {/* Active Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 font-bold uppercase block">Static Telemetry Sync State</label>
                    <div className="flex items-center h-9">
                      <button
                        type="button"
                        onClick={() => setLocalSyncEnabled(!localSyncEnabled)}
                        className={`w-full py-1.5 rounded text-xs font-bold transition-all border cursor-pointer ${
                          localSyncEnabled 
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                            : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {localSyncEnabled ? '✓ Enabled' : '✗ Disabled (Local Only)'}
                      </button>
                    </div>
                    <p className="text-[9px] text-zinc-500">Toggle static sync to switch between simulated and live telemetry modes.</p>
                  </div>

                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setLocalFilePath('./telemetry_data.json');
                      setLocalPollRate(15000);
                      setLocalSyncEnabled(true);
                    }}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded text-[10px] font-mono font-bold transition-colors border border-zinc-800/80 cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <button
                    onClick={() => {
                      if (onUpdateConfig) {
                        onUpdateConfig(localFilePath, localPollRate, localSyncEnabled);
                      }
                    }}
                    className="px-4 py-1.5 bg-[#4daeff] hover:bg-[#4daeff]/90 text-black font-bold rounded text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Save & Apply Config
                  </button>
                </div>
              </div>

              {/* Step-by-Step Interactive Implementation Guide */}
              <div className="p-5 bg-zinc-900/20 border border-zinc-850 rounded-lg space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles size={15} className="text-[#a855f7]" />
                      <span>Interactive Test Runner Integration Generator</span>
                    </h4>
                    <p className="text-[11px] text-zinc-400">Generate and copy custom reporters tailored to output AWARE-compliant telemetry payloads automatically.</p>
                  </div>
                  
                  {/* Runner selection */}
                  <div className="flex bg-[#0a0a0a] border border-zinc-800 p-0.5 rounded text-[10px] font-mono shrink-0">
                    <button
                      onClick={() => setActiveRunner('playwright')}
                      className={`px-3 py-1 rounded transition-all cursor-pointer ${activeRunner === 'playwright' ? 'bg-[#1c1c1c] text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Playwright
                    </button>
                    <button
                      onClick={() => setActiveRunner('cypress')}
                      className={`px-3 py-1 rounded transition-all cursor-pointer ${activeRunner === 'cypress' ? 'bg-[#1c1c1c] text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Cypress
                    </button>
                    <button
                      onClick={() => setActiveRunner('vitest_jest')}
                      className={`px-3 py-1 rounded transition-all cursor-pointer ${activeRunner === 'vitest_jest' ? 'bg-[#1c1c1c] text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Vitest / Jest
                    </button>
                  </div>
                </div>

                {activeRunner === 'playwright' && (
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                      <span>CUSTOM PLAYWRIGHT REPORTER (AWARE-REPORTER.TS)</span>
                      <button 
                        onClick={() => copyToClipboard(`import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import fs from 'fs';

class AwareReporter implements Reporter {
  private runsCount = 0;
  private passedCount = 0;
  private failedCount = 0;
  private cases: any[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.runsCount++;
    if (result.status === 'passed') this.passedCount++;
    else if (result.status === 'failed') this.failedCount++;

    this.cases.push({
      id: test.id,
      name: test.title,
      status: result.status === 'passed' ? 'Passed' : result.status === 'failed' ? 'Failed' : 'Flaky',
      duration: \`\${result.duration}ms\`,
      priority: 'P1 - High'
    });
  }

  onEnd(result: FullResult) {
    const payload = {
      version: "1.2.0-secure",
      runs: [{
        id: \`RUN-\${Date.now()}\`,
        name: "Playwright Automated Smoke Run",
        branch: process.env.GITHUB_REF_NAME || "local",
        status: result.status === 'passed' ? 'Passed' : 'Failed',
        environment: "QA",
        duration: \`\${result.duration || 0}ms\`,
        timestamp: new Date().toISOString(),
        passRate: Math.round((this.passedCount / this.runsCount) * 100) || 0,
        triggeredBy: process.env.GITHUB_ACTOR || "Local Developer",
        commit: process.env.GITHUB_SHA || "local-head",
        testsCount: this.runsCount,
        passedCount: this.passedCount,
        failedCount: this.failedCount,
        suite: "Smoke"
      }],
      testCases: this.cases
    };
    fs.writeFileSync('${localFilePath}', JSON.stringify(payload, null, 2));
    console.log('✓ Compiled AWARE telemetries saved to ${localFilePath}');
  }
}
export default AwareReporter;`)}
                        className="hover:text-white px-2 py-0.5 bg-[#0a0a0a] rounded border border-zinc-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Clipboard size={10} /> {copiedText ? "Copied!" : "Copy Reporter"}
                      </button>
                    </div>

                    <div className="bg-[#070707] border border-zinc-900 rounded p-4 font-mono text-[11px] text-zinc-300 space-y-1 whitespace-pre overflow-x-auto select-all leading-relaxed max-h-[250px]">
                      <div><span className="text-[#a855f7]">import</span> {"{ Reporter, TestCase, TestResult, FullResult }"} <span className="text-[#a855f7]">from</span> <span className="text-emerald-400">'@playwright/test/reporter'</span>;</div>
                      <div><span className="text-[#a855f7]">import</span> fs <span className="text-[#a855f7]">from</span> <span className="text-emerald-400">'fs'</span>;</div>
                      <div className="text-zinc-500">{"\n// Saves the test run metadata as an ingestion contract"}</div>
                      <div><span className="text-[#a855f7]">class</span> <span className="text-[#4daeff]">AwareReporter</span> <span className="text-[#a855f7]">implements</span> Reporter {"{"}</div>
                      <div>  onEnd(result: FullResult) {"{"}</div>
                      <div>    <span className="text-[#a855f7]">const</span> payload = {"{"}</div>
                      <div>      version: <span className="text-emerald-400">"1.2.0-secure"</span>,</div>
                      <div>      runs: [{"{"}</div>
                      <div>        id: <span className="text-emerald-400">{`"RUN-${Date.now()}"`}</span>,</div>
                      <div>        name: <span className="text-emerald-400">"Playwright Test Suite Run"</span>,</div>
                      <div>        status: result.status === <span className="text-emerald-400">'passed'</span> ? <span className="text-emerald-400">'Passed'</span> : <span className="text-emerald-400">'Failed'</span>,</div>
                      <div>        testsCount: <span className="text-amber-400">12</span>, passedCount: <span className="text-amber-400">12</span>, failedCount: <span className="text-amber-400">0</span></div>
                      <div>      {"}]"}</div>
                      <div>    {"};"}</div>
                      <div>    fs.writeFileSync(<span className="text-emerald-400">"{localFilePath}"</span>, JSON.stringify(payload, <span className="text-[#a855f7]">null</span>, <span className="text-amber-400">2</span>));</div>
                      <div>  {"}"}</div>
                      <div>{"}"}</div>
                    </div>
                  </div>
                )}

                {activeRunner === 'cypress' && (
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                      <span>CYPRESS POST-RUN HOOK CONFIGURATION (CYPRESS.CONFIG.TS)</span>
                      <button 
                        onClick={() => copyToClipboard(`import { defineConfig } from "cypress";
import fs from "fs";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('after:run', (results) => {
        if (results && 'runs' in results) {
          const testCases = results.runs.flatMap(run => 
            run.tests.map(test => ({
              id: test.title.join('_').replace(/\\s+/g, '-'),
              name: test.title.join(' › '),
              status: test.state === 'passed' ? 'Passed' : 'Failed',
              duration: \`\${test.duration}ms\`,
              priority: 'P1 - High'
            }))
          );
          const payload = {
            version: "1.2.0-secure",
            runs: [{
              id: \`CY-\${Date.now()}\`,
              name: "Cypress Automated Suite Run",
              branch: process.env.GITHUB_REF_NAME || "local",
              status: results.totalFailed === 0 ? 'Passed' : 'Failed',
              environment: "QA",
              passRate: Math.round(((results.totalPassed) / results.totalTests) * 100) || 0,
              triggeredBy: process.env.GITHUB_ACTOR || "Local Developer",
              commit: process.env.GITHUB_SHA || "local-head",
              testsCount: results.totalTests,
              passedCount: results.totalPassed,
              failedCount: results.totalFailed,
              suite: "Regression"
            }],
            testCases
          };
          fs.writeFileSync('${localFilePath}', JSON.stringify(payload, null, 2));
          console.log('✓ Cypress telemetry compiled to ${localFilePath}');
        }
      });
    },
  },
});`)}
                        className="hover:text-white px-2 py-0.5 bg-[#0a0a0a] rounded border border-zinc-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Clipboard size={10} /> {copiedText ? "Copied!" : "Copy Hook Configuration"}
                      </button>
                    </div>

                    <div className="bg-[#070707] border border-zinc-900 rounded p-4 font-mono text-[11px] text-zinc-300 space-y-1 whitespace-pre overflow-x-auto select-all leading-relaxed max-h-[250px]">
                      <div><span className="text-[#a855f7]">import</span> {"{ defineConfig }"} <span className="text-[#a855f7]">from</span> <span className="text-emerald-400">"cypress"</span>;</div>
                      <div><span className="text-[#a855f7]">import</span> fs <span className="text-[#a855f7]">from</span> <span className="text-emerald-400">"fs"</span>;</div>
                      <div><span className="text-[#a855f7]">export default</span> defineConfig({"{"}</div>
                      <div>  e2e: {"{"}</div>
                      <div>    setupNodeEvents(on, config) {"{"}</div>
                      <div>      on(<span className="text-emerald-400">'after:run'</span>, (results) =&gt; {"{"}</div>
                      <div>        <span className="text-zinc-500">{"// Aggregate Cypress outcomes..."}</span></div>
                      <div>        fs.writeFileSync(<span className="text-emerald-400">"{localFilePath}"</span>, JSON.stringify(payload, <span className="text-[#a855f7]">null</span>, <span className="text-amber-400">2</span>));</div>
                      <div>      {"});"}</div>
                      <div>    {"}"}</div>
                      <div>  {"}"}</div>
                      <div>{"});"}</div>
                    </div>
                  </div>
                )}

                {activeRunner === 'vitest_jest' && (
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                      <span>VITEST GLOBAL REPORTER & DEPLOY HOOK (AWARE-VITEST-SETUP.TS)</span>
                      <button 
                        onClick={() => copyToClipboard(`import fs from 'fs';

export default function globalTeardown() {
  const telemetry = {
    version: "1.2.0-secure",
    runs: [{
      id: \`VITEST-\${Date.now()}\`,
      name: "Vitest Automated Pipeline",
      branch: process.env.GITHUB_REF_NAME || "main",
      status: "Passed",
      environment: "QA",
      passRate: 100,
      timestamp: new Date().toISOString(),
      testsCount: 20,
      passedCount: 20,
      failedCount: 0,
      suite: "Smoke"
    }],
    testCases: []
  };
  fs.writeFileSync('${localFilePath}', JSON.stringify(telemetry, null, 2));
  console.log('✓ Vitest/Jest telemetry written to ${localFilePath}');
}`)}
                        className="hover:text-white px-2 py-0.5 bg-[#0a0a0a] rounded border border-zinc-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Clipboard size={10} /> {copiedText ? "Copied!" : "Copy Setup"}
                      </button>
                    </div>

                    <div className="bg-[#070707] border border-zinc-900 rounded p-4 font-mono text-[11px] text-zinc-300 space-y-1 whitespace-pre overflow-x-auto select-all leading-relaxed max-h-[250px]">
                      <div><span className="text-[#a855f7]">import</span> fs <span className="text-[#a855f7]">from</span> <span className="text-emerald-400">'fs'</span>;</div>
                      <div><span className="text-[#a855f7]">export default function</span> <span className="text-[#4daeff]">globalTeardown</span>() {"{"}</div>
                      <div>  <span className="text-[#a855f7]">const</span> telemetry = {"{ ... };"}</div>
                      <div>  fs.writeFileSync(<span className="text-emerald-400">"{localFilePath}"</span>, JSON.stringify(telemetry, <span className="text-[#a855f7]">null</span>, <span className="text-amber-400">2</span>));</div>
                      <div>{"}"}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Environment Deployment Strategies */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase font-bold text-[#4daeff] bg-[#4daeff]/10 px-1.5 py-0.5 rounded">
                  Multi-Environment Pipeline Orchestration
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#4daeff]"></span>
                      <strong className="text-white font-semibold">QA (Quality Assurance)</strong>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Configure your local/PR test workflows to write telemetry payloads during testing pipelines to catch compilation defects immediately.
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <strong className="text-white font-semibold">UAT (User Acceptance)</strong>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Build staging environments with a separate hosted JSON file (e.g. <code className="text-amber-400 font-mono text-[9px]">./telemetry_uat.json</code>) to preserve environment boundary records safely.
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <strong className="text-white font-semibold">Prod (Production)</strong>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Production smoke test cycles compile real-time sanity signals directly into production static bundles to verify post-deployment reliability instantly.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
