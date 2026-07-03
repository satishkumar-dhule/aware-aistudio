import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  X, 
  Terminal, 
  Video, 
  ExternalLink, 
  Search, 
  SlidersHorizontal,
  ChevronRight,
  RefreshCw,
  User,
  GitBranch,
  FolderDot,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { BrowserDb } from '../lib/browserDb';
import { Run, TestCase } from '../types';
import TestCaseModal from './TestCaseModal';

interface RunsViewProps {
  searchQuery: string;
  onRefreshData?: () => void;
  onSelectTest: (testId: string) => void;
  activeEnv: 'All' | 'QA' | 'UAT' | 'PROD';

  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function RunsView({ searchQuery, onRefreshData, onSelectTest, activeEnv, onShowToast }: RunsViewProps) {
  const [runs, setRuns] = useState<Run[]>(BrowserDb.getRuns());
  const [selectedRun, setSelectedRun] = useState<Run>(BrowserDb.getRuns()[1] || BrowserDb.getRuns()[0]);
  const [runTestCases, setRunTestCases] = useState<TestCase[]>(() => {
    const initialRun = BrowserDb.getRuns()[1] || BrowserDb.getRuns()[0];
    return initialRun ? BrowserDb.getTestCases().filter(tc => tc.runId === initialRun.id) : [];
  });
  const [activeTab, setActiveTab] = useState<'Summary' | 'Results' | 'Logs'>('Summary');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalTestCaseId, setModalTestCaseId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 25;

  // Synchronize with database updates
  useEffect(() => {
    const handleUpdate = () => {
      const updatedRuns = BrowserDb.getRuns();
      setRuns(updatedRuns);
      // Ensure we don't have a stale selection
      setSelectedRun(prev => {
        if (!prev) return prev;
        const found = updatedRuns.find(r => r.id === prev.id);
        const activeRun = found || prev;
        setRunTestCases(BrowserDb.getTestCases().filter(tc => tc.runId === activeRun.id));
        return activeRun;
      });
    };
    window.addEventListener('aware_db_update', handleUpdate);
    return () => window.removeEventListener('aware_db_update', handleUpdate);
  }, []);

  // Interactive filters
  const [statusFilters, setStatusFilters] = useState({
    All: true,
    Pass: true,
    Fail: true,
    Flaky: true,
  });
  const [envFilter, setEnvFilter] = useState<'All' | 'Prod' | 'UAT' | 'QA'>('All');

  // Synchronize global environment selector with local filters
  useEffect(() => {
    if (activeEnv === 'All') {
      setEnvFilter('All');
    } else if (activeEnv === 'PROD') {
      setEnvFilter('Prod');
    } else {
      setEnvFilter(activeEnv as any);
    }
  }, [activeEnv]);
  const [suiteFilter, setSuiteFilter] = useState<'All' | 'Smoke' | 'Security' | 'Regression' | 'Performance'>('All');
  const [sortBy, setSortBy] = useState<'Latest' | 'Duration' | 'Pass Rate'>('Latest');

  // Logs for Selected Run
  const mockLogs = {
    'RUN-8492-AX': [
      '[00:01] INFO: Initializing testing agent container...',
      '[00:03] INFO: Loaded 1,405 test cases from suite prd-smk-01.',
      '[00:15] DEBUG: Connecting to backend API-Gateway at staging-eu-west...',
      '[01:04] SUCCESS: fetch_user_profile_data passed (0.4s)',
      '[01:32] SUCCESS: load_dashboard_widgets passed (0.8s)',
      '[02:10] WARNING: submit_checkout_form flaky (5.1s) - Retrying attempt 1...',
      '[02:40] ERROR: verify_user_authentication failed (1.2s)',
      '[02:41] ASSERTION_ERROR: expected { Object (id, email, ...) } to deeply equal...',
      '[03:15] CRITICAL: Container \'api-gateway\' exceeded 95% memory threshold!',
      '[04:12] ERROR: Pipeline execution halted. 3 failures detected.',
    ],
    'RUN-9482-sec': [
      '[00:01] INFO: Initializing core security audit runner...',
      '[00:04] INFO: Loaded 1,222 test cases.',
      '[04:30] SUCCESS: CSRF token validation passed (0.2s)',
      '[08:15] SUCCESS: CORS origin validation passed (0.5s)',
      '[12:45] SUCCESS: Security audit complete. 0 vulnerabilities found.'
    ]
  };

  const handleFilterReset = () => {
    setStatusFilters({ All: true, Pass: true, Fail: true, Flaky: true });
    setEnvFilter('All');
    setSuiteFilter('All');
    setCurrentPage(1);
  };

  const toggleStatusFilter = (key: keyof typeof statusFilters) => {
    setStatusFilters(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      // If "All" is toggled, sync others or vice versa
      if (key === 'All') {
        return { All: updated.All, Pass: updated.All, Fail: updated.All, Flaky: updated.All };
      } else {
        const allChecked = updated.Pass && updated.Fail && updated.Flaky;
        return { ...updated, All: allChecked };
      }
    });
  };

  const getFilteredRuns = () => {
    return runs.filter(run => {
      // Search filter
      const matchesSearch = run.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            run.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            run.branch.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      let matchesStatus = false;
      if (statusFilters.All) {
        matchesStatus = true;
      } else {
        if (statusFilters.Pass && run.status === 'Passed') matchesStatus = true;
        if (statusFilters.Fail && run.status === 'Failed') matchesStatus = true;
        if (statusFilters.Flaky && run.status === 'Flaky') matchesStatus = true;
      }

      // Env filter
      const matchesEnv = envFilter === 'All' || run.environment === envFilter;

      // Suite filter
      const matchesSuite = suiteFilter === 'All' || run.suite === suiteFilter;

      return matchesSearch && matchesStatus && matchesEnv && matchesSuite;
    }).sort((a, b) => {
      if (sortBy === 'Duration') {
        return b.duration.localeCompare(a.duration);
      } else if (sortBy === 'Pass Rate') {
        return b.passRate - a.passRate;
      }
      return b.id.localeCompare(a.id); // Default Latest sort
    });
  };

  const filteredRuns = getFilteredRuns();
  
  const totalPages = Math.ceil(filteredRuns.length / ITEMS_PER_PAGE);
  const paginatedRuns = filteredRuns.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 if filtered results change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilters, envFilter, suiteFilter, sortBy]);

  const getStatusIcon = (status: Run['status'], size = 16) => {
    switch (status) {
      case 'Passed': return <CheckCircle size={size} className="text-green-500" />;
      case 'Failed': return <XCircle size={size} className="text-red-500" />;
      case 'Flaky': return <AlertTriangle size={size} className="text-amber-500" />;
      default: return <RefreshCw size={size} className="text-blue-400 animate-spin" />;
    }
  };

  const handleReRun = () => {
    if (onShowToast) {
      onShowToast(`Re-triggering run pipeline for ${selectedRun.id} on branch ${selectedRun.branch}. Tests will execute recursively.`, 'info');
    }
    if (onRefreshData) {
      onRefreshData();
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-950 select-none font-sans">
      {/* Filters Left Sidebar */}
      <aside className="w-[160px] border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-3 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-950 z-10">
          <h2 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-300 flex items-center gap-1.5">
            <SlidersHorizontal size={11} /> Filters
          </h2>
          <button onClick={handleFilterReset} className="text-[9px] font-mono font-bold uppercase text-blue-400 hover:underline">Reset</button>
        </div>

        <div className="p-3 space-y-5">
          {/* Status Filter */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500">Status</h3>
            <div className="space-y-2">
              {Object.keys(statusFilters).map((statusKey) => {
                const key = statusKey as keyof typeof statusFilters;
                return (
                  <label key={key} className="flex justify-between items-center cursor-pointer group text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={statusFilters[key]}
                        onChange={() => toggleStatusFilter(key)}
                        className="rounded bg-zinc-800 border-zinc-700 text-blue-400 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="group-hover:text-white transition-colors flex items-center gap-1.5">
                        {key === 'Pass' && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                        {key === 'Fail' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                        {key === 'Flaky' && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                        {key}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Environment Filter */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500">Environment</h3>
            <div className="space-y-1.5">
              {(['All', 'Prod', 'UAT', 'QA'] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => setEnvFilter(env)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
                    (env === 'All' && envFilter === 'All') || envFilter === env
                      ? 'bg-blue-500/10 text-blue-400 font-bold border border-blue-500/30'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white border border-transparent'
                  }`}
                >
                  {env === 'All' ? 'All Environments' : env}
                </button>
              ))}
            </div>
          </div>

          {/* Suite Category Filter */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500">Suite</h3>
            <div className="flex flex-wrap gap-1.5">
              {(['All', 'Smoke', 'Security', 'Regression', 'Performance'] as const).map((suite) => (
                <button
                  key={suite}
                  onClick={() => setSuiteFilter(suite)}
                  className={`px-2 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all border ${
                    (suite === 'All' && suiteFilter === 'All') || suiteFilter === suite
                      ? 'bg-blue-500 text-black border-blue-500'
                      : 'bg-zinc-800 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  {suite}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Runs List Center Area */}
      <section className="flex-1 border-r border-zinc-800 flex flex-col h-full bg-zinc-950">
        {/* Header toolbar */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white">Recent Runs</h2>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 text-[10px] font-mono">Showing {filteredRuns.length} of {runs.length}</span>
          </div>
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-zinc-800 border border-zinc-800 rounded text-[10px] font-mono uppercase font-bold text-zinc-300 py-1 pl-2 pr-7 outline-none focus:border-blue-500"
            >
              <option value="Latest">Sort: Latest</option>
              <option value="Duration">Sort: Duration</option>
              <option value="Pass Rate">Sort: Pass Rate</option>
            </select>
          </div>
        </div>

        {/* Scrollable runs feed list */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40 flex flex-col">
          {paginatedRuns.length > 0 ? (
            paginatedRuns.map((run) => {
              const isSelected = selectedRun.id === run.id;
              return (
                <div
                  key={run.id}
                  onClick={() => { setSelectedRun(run); setActiveTab('Summary'); }}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-all duration-150 ${
                    isSelected 
                      ? 'bg-zinc-800 border-l-4 border-l-blue-400' 
                      : 'hover:bg-zinc-900 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="shrink-0">{getStatusIcon(run.status, 18)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono text-xs text-blue-400 font-bold">{run.id}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{run.timestamp}</span>
                    </div>
                    <div className="text-xs text-zinc-200 font-semibold truncate leading-none">{run.name}</div>
                    <div className="text-[10px] text-zinc-500 truncate mt-1 flex items-center gap-1 font-mono">
                      <GitBranch size={10} /> {run.branch}
                    </div>
                  </div>
                  <div className="w-20 flex flex-col items-end">
                    <span className="text-xs font-mono font-bold text-white">{run.passRate}%</span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{run.duration}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No runs match active status or environment filter selections.
            </div>
          )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex justify-between items-center mt-auto">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-zinc-500">Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs rounded hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Right Column: Run Details (Progressive Disclosure) */}
      <aside className="w-[360px] flex-col h-full bg-zinc-950 flex shrink-0 border-l border-zinc-800">
        {/* Detail Header */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-800">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-sm font-mono text-[9px] uppercase font-bold border ${
                  selectedRun.status === 'Passed' 
                    ? 'bg-green-500/15 text-green-500 border-green-500/30' 
                    : selectedRun.status === 'Failed'
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {selectedRun.status}
                </span>
                <span className="font-mono text-xs text-zinc-500">{selectedRun.id}</span>
              </div>
              <h2 className="text-sm font-bold text-white break-all">{selectedRun.name}</h2>
            </div>
          </div>

          {/* Sub Navigation Details tabs */}
          <div className="flex gap-4">
            {(['Summary', 'Results', 'Logs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-1 py-1.5 font-mono text-[10px] uppercase font-bold tracking-wider relative transition-colors ${
                  activeTab === tab ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Tab Content Panels */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-950 space-y-4">
          {activeTab === 'Summary' && (
            <>
              {/* Anomaly Alerts (if failed) */}
              {selectedRun.hasMemoryAnomaly && (
                <div className="border border-red-500/50 bg-red-500/5 p-3 flex items-start gap-2.5 rounded">
                  <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-red-400 font-mono">High Memory Usage Detected</span>
                    <span className="text-[10px] text-red-400/80 mt-0.5 leading-normal">
                      Container 'api-gateway' exceeded 95% memory threshold during test suite execution.
                    </span>
                  </div>
                </div>
              )}

              {/* Grid Bento Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded flex flex-col justify-between h-16">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold tracking-wider">Environment</span>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> {selectedRun.environment}
                  </span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded flex flex-col justify-between h-16">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold tracking-wider">Duration</span>
                  <span className="text-xs font-bold text-white font-mono mt-1">{selectedRun.duration}</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded flex flex-col justify-between h-16">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold tracking-wider">Triggered By</span>
                  <span className="text-xs font-bold text-white flex items-center gap-1 mt-1 font-sans">
                    <User size={12} className="text-zinc-500" /> {selectedRun.triggeredBy}
                  </span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded flex flex-col justify-between h-16">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold tracking-wider">Commit</span>
                  <span className="text-xs font-bold text-white font-mono truncate mt-1 flex items-center gap-1">
                    <GitBranch size={12} className="text-zinc-500" /> {selectedRun.commit}
                  </span>
                </div>
              </div>

              {/* Execution Summary stacked bar breakdown */}
              <div className="space-y-4 pt-2">
                <h3 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500">Execution Summary</h3>
                <div className="flex h-3 rounded-full overflow-hidden bg-zinc-800 border border-zinc-800">
                  <div className="bg-green-500" style={{ width: `${(selectedRun.passedCount / selectedRun.testsCount) * 100}%` }} />
                  <div className="bg-amber-500" style={{ width: `${(selectedRun.skippedCount / selectedRun.testsCount) * 100}%` }} />
                  <div className="bg-red-500" style={{ width: `${(selectedRun.failedCount / selectedRun.testsCount) * 100}%` }} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900 transition-colors cursor-pointer group text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-zinc-300">Passed</span>
                    </div>
                    <span className="font-mono text-zinc-400 group-hover:text-blue-400">{selectedRun.passedCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900 transition-colors cursor-pointer group text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span className="text-zinc-300">Skipped / Flaky</span>
                    </div>
                    <span className="font-mono text-zinc-400 group-hover:text-blue-400">{selectedRun.skippedCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-zinc-900 transition-colors cursor-pointer group text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-zinc-300">Failed</span>
                    </div>
                    <span className="font-mono text-zinc-400 group-hover:text-blue-400">{selectedRun.failedCount}</span>
                  </div>
                </div>
              </div>

              {/* Artifacts Panel */}
              <div className="pt-2 border-t border-zinc-800/50">
                <h3 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500 mb-3">Artifacts</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => setActiveTab('Logs')} className="flex items-center justify-center gap-2 p-2 rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-200 text-xs transition-colors">
                    <Terminal size={14} className="text-zinc-500" /> Terminal Logs
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Results' && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500">Active Test Cases ({runTestCases.length})</h3>
              <div className="space-y-2">
                {runTestCases.length > 0 ? (
                  runTestCases.slice(0, 50).map(tc => (
                    <div 
                      key={tc.id} 
                      className="p-3 bg-zinc-900 border border-zinc-800 rounded flex flex-col gap-2 group hover:border-blue-500/30 transition-all cursor-pointer" onClick={() => setModalTestCaseId(tc.id)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-xs text-zinc-200 font-mono block group-hover:text-blue-400 transition-colors">{tc.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{tc.folder}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setModalTestCaseId(tc.id); }}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                            title="Expand Details"
                          >
                            <Maximize2 size={14} />
                          </button>
                          <span className={`text-[9px] font-mono uppercase font-bold border px-1.5 py-0.5 rounded shrink-0 ${
                            tc.status === 'Passed' 
                              ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                              : tc.status === 'Failed' 
                              ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {tc.status}
                          </span>
                        </div>
                      </div>
                      
                      {/* HTTP Network Details */}
                      <div className="mt-2 pt-2 border-t border-zinc-800 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <div className="flex gap-2">
                            <span className="text-zinc-500 uppercase tracking-wider font-bold">Network</span>
                            <span className={`px-1 rounded font-bold ${tc.status === 'Failed' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-400'}`}>
                              {tc.status === 'Failed' ? '500 ERROR' : '200 OK'}
                            </span>
                          </div>
                          <span className="text-zinc-500 truncate max-w-[200px]" title="https://api.test-runner.local/v1/telemetry/evaluate">https://api.test-runner.local/v1/telemetry/evaluate</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="bg-zinc-950 border border-zinc-800 rounded p-2 overflow-x-auto">
                            <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-widest block mb-1">Headers</span>
                            <div className="text-[9px] font-mono text-zinc-400 whitespace-nowrap">
                              <div><span className="text-zinc-500">Content-Type:</span> application/json</div>
                              <div><span className="text-zinc-500">Cache-Control:</span> no-cache</div>
                              <div><span className="text-zinc-500">X-Request-Id:</span> req_{tc.id.substring(0, 8) || 'xyz123'}</div>
                              <div><span className="text-zinc-500">User-Agent:</span> Playwright/1.44.1</div>
                            </div>
                          </div>
                          <div className="bg-zinc-950 border border-zinc-800 rounded p-2 overflow-x-auto">
                            <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-widest block mb-1">Cookies</span>
                            <div className="text-[9px] font-mono text-zinc-400 whitespace-nowrap">
                              <div><span className="text-zinc-500">session_id:</span> s_{tc.runId ? tc.runId.substring(0, 6) : '9999'}</div>
                              <div><span className="text-zinc-500">_csrf:</span> token_8x9a</div>
                              <div><span className="text-zinc-500">auth_token:</span> jwt_xxxx_yyyy</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-zinc-950 border border-zinc-800 rounded p-2 mt-1">
                          <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-widest block mb-1.5">Waterfall Timeline</span>
                          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden flex">
                            <div className="h-full bg-blue-500/50" style={{ width: '15%' }} title="DNS Lookup: 15%"></div>
                            <div className="h-full bg-amber-500/50" style={{ width: '20%' }} title="Initial Connection: 20%"></div>
                            <div className="h-full bg-purple-500/50" style={{ width: '10%' }} title="SSL: 10%"></div>
                            <div className="h-full bg-green-500/50" style={{ width: '35%' }} title="TTFB: 35%"></div>
                            <div className="h-full bg-cyan-500/50" style={{ width: '20%' }} title="Content Download: 20%"></div>
                          </div>
                          <div className="flex justify-between text-[8px] font-mono text-zinc-600 mt-1">
                            <span>0ms</span>
                            <span>{tc.duration}</span>
                          </div>
                        </div>
                      </div>
                      
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-zinc-500 border border-zinc-800 rounded bg-zinc-900">
                    No test cases found for this run.
                  </div>
                )}
                
                {runTestCases.length > 50 && (
                  <div className="p-2 text-center text-[10px] font-mono text-zinc-500">
                    Showing first 50 of {runTestCases.length} tests. View full list in the Tests tab.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Logs' && (
            <div className="space-y-3">
              <div className="bg-black/40 border border-zinc-800 p-3 rounded font-mono text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap select-all">
                {mockLogs[selectedRun.id as keyof typeof mockLogs]?.map((log, index) => (
                  <div key={index} className={
                    log.includes('ERROR') || log.includes('ASSERTION') ? 'text-red-400' :
                    log.includes('WARNING') ? 'text-amber-400' :
                    log.includes('SUCCESS') ? 'text-emerald-400' : 'text-zinc-400'
                  }>
                    {log}
                  </div>
                )) || (
                  <div className="text-zinc-500 text-center">No raw server logs populated.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
      {modalTestCaseId && (
        <TestCaseModal 
          testCases={runTestCases} 
          initialTestId={modalTestCaseId} 
          onClose={() => setModalTestCaseId(null)} 
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
}
