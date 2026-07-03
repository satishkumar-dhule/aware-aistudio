import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Code, 
  Terminal, 
  History, 
  BarChart, 
  Copy, 
  GitCommit, 
  RefreshCw, 
  SlidersHorizontal,
  ChevronDown,
  Clock,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { BrowserDb } from '../lib/browserDb';
import { TestCase } from '../types';

interface TestsViewProps {
  selectedTestId: string | null;
  searchQuery: string;
  activeEnv: 'All' | 'QA' | 'UAT' | 'PROD';
  onTriggerAi?: (prompt: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function TestsView({ selectedTestId, searchQuery, activeEnv, onTriggerAi, onShowToast }: TestsViewProps) {
  const [testCases, setTestCases] = useState<TestCase[]>(BrowserDb.getTestCases());
  const [selectedTest, setSelectedTest] = useState<TestCase>(BrowserDb.getTestCases()[0]);
  const [activeDetailTab, setActiveDetailTab] = useState<'Error' | 'History' | 'Metrics'>('Error');
  const [isRetrying, setIsRetrying] = useState(false);

  // Synchronize dynamic state from database
  useEffect(() => {
    const handleUpdate = () => {
      const updated = BrowserDb.getTestCases();
      setTestCases(updated);
      setSelectedTest(prev => {
        if (!prev) return prev;
        const match = updated.find(t => t.id === prev.id);
        return match || prev;
      });
    };
    window.addEventListener('aware_db_update', handleUpdate);
    return () => window.removeEventListener('aware_db_update', handleUpdate);
  }, []);

  // Filters State
  const [statusFilters, setStatusFilters] = useState({
    Failed: true,
    Flaky: true,
    Passed: true,
  });
  const [priorityFilters, setPriorityFilters] = useState({
    P0: true,
    P1: true,
    P2: true,
  });
  const [sortBy, setSortBy] = useState<'Fail Rate' | 'Duration' | 'Name'>('Fail Rate');

  // Triggered when selectedTestId changes from parent (e.g. clicks from dashboard)
  useEffect(() => {
    if (selectedTestId) {
      const match = testCases.find(t => t.id === selectedTestId);
      if (match) {
        setSelectedTest(match);
      }
    }
  }, [selectedTestId, testCases]);

  const handleFilterReset = () => {
    setStatusFilters({ Failed: true, Flaky: true, Passed: true });
    setPriorityFilters({ P0: true, P1: true, P2: true });
  };

  const getFilteredTests = () => {
    return testCases.filter(tc => {
      // Search matches
      const matchesSearch = tc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            tc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tc.folder.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filters
      let matchesStatus = false;
      if (statusFilters.Failed && tc.status === 'Failed') matchesStatus = true;
      if (statusFilters.Flaky && tc.status === 'Flaky') matchesStatus = true;
      if (statusFilters.Passed && tc.status === 'Passed') matchesStatus = true;

      // Priority filters
      let matchesPriority = false;
      if (priorityFilters.P0 && tc.priority.includes('P0')) matchesPriority = true;
      if (priorityFilters.P1 && tc.priority.includes('P1')) matchesPriority = true;
      if (priorityFilters.P2 && tc.priority.includes('P2')) matchesPriority = true;

      // Environment filter
      let matchesEnv = true;
      if (activeEnv !== 'All') {
        const run = BrowserDb.getRuns().find(r => r.id === tc.runId);
        if (run) {
          const runEnv = run.environment === 'Prod' ? 'PROD' : run.environment;
          matchesEnv = runEnv === activeEnv;
        } else {
          matchesEnv = false;
        }
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesEnv;
    }).sort((a, b) => {
      if (sortBy === 'Duration') {
        return b.duration.localeCompare(a.duration);
      } else if (sortBy === 'Name') {
        return a.name.localeCompare(b.name);
      }
      // Sort by failure / flakiness first
      const statusRank = { 'Failed': 3, 'Flaky': 2, 'Passed': 1, 'Skipped': 0 };
      return statusRank[b.status] - statusRank[a.status];
    });
  };

  const filteredTests = getFilteredTests();

  const handleRetryTest = () => {
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      
      const allTCs = BrowserDb.getTestCases();
      const updated = allTCs.map(t => t.id === selectedTest.id ? { 
        ...t, 
        status: 'Passed' as const, 
        errorMsg: undefined, 
        stackTrace: undefined 
      } : t);
      
      BrowserDb.saveTestCases(updated);
      if (onShowToast) {
        onShowToast(`Simulation retry complete for test: ${selectedTest.name}. Result is Passed!`, 'success');
      }
    }, 1500);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0c0c0c] select-none font-sans">
      {/* Faceted Filters Left column */}
      <aside className="w-[200px] border-r border-[#222222] bg-[#111111] flex flex-col shrink-0 overflow-y-auto">
        <div className="p-3 border-b border-[#222222] flex justify-between items-center sticky top-0 bg-[#111111] z-10">
          <h2 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-300">Filters</h2>
          <button onClick={handleFilterReset} className="text-[9px] font-mono font-bold uppercase text-[#4daeff] hover:underline">Clear</button>
        </div>

        {/* Filter groups */}
        <div className="p-4 space-y-5">
          {/* Status Group */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500">Status</h3>
            <div className="space-y-1.5">
              {(['Failed', 'Flaky', 'Passed'] as const).map(status => (
                <label key={status} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={statusFilters[status]}
                    onChange={() => setStatusFilters(prev => ({ ...prev, [status]: !prev[status] }))}
                    className="rounded bg-[#1a1a1a] border-zinc-700 text-[#4daeff] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                  />
                  <span className="group-hover:text-white transition-colors">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority Group */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500">Priority</h3>
            <div className="space-y-1.5">
              {(['P0', 'P1', 'P2'] as const).map(prio => (
                <label key={prio} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={priorityFilters[prio]}
                    onChange={() => setPriorityFilters(prev => ({ ...prev, [prio]: !prev[prio] }))}
                    className="rounded bg-[#1a1a1a] border-zinc-700 text-[#4daeff] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                  />
                  <span className="group-hover:text-white transition-colors">
                    {prio === 'P0' ? 'P0 - Critical' : prio === 'P1' ? 'P1 - High' : 'P2 - Medium'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Tests List column */}
      <section className="flex-1 flex flex-col border-r border-[#262626] bg-[#0c0c0c] min-w-[300px]">
        {/* Toolbar Header */}
        <div className="p-3 border-b border-[#262626] flex justify-between items-center bg-[#101010] sticky top-0 z-10">
          <span className="text-[10px] font-mono uppercase font-bold text-zinc-500">{filteredTests.length} Results</span>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <span className="text-[10px] uppercase font-bold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-[10px] uppercase font-bold text-zinc-200 outline-none focus:ring-0 py-0 pl-1 pr-6 cursor-pointer"
            >
              <option value="Fail Rate">Fail Rate</option>
              <option value="Duration">Duration</option>
              <option value="Name">Name</option>
            </select>
          </div>
        </div>

        {/* Scrollable list content */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#262626]/40">
          {filteredTests.map((tc) => {
            const isSelected = selectedTest.id === tc.id;
            return (
              <div
                key={tc.id}
                onClick={() => { setSelectedTest(tc); setActiveDetailTab('Error'); }}
                className={`p-4 flex flex-col gap-2 cursor-pointer transition-all border-l-2 ${
                  isSelected 
                    ? 'bg-[#1a1a1a] border-l-red-500' 
                    : tc.status === 'Failed' 
                    ? 'hover:bg-[#151515] border-l-red-500/30' 
                    : tc.status === 'Flaky'
                    ? 'hover:bg-[#151515] border-l-amber-500/30'
                    : 'hover:bg-[#151515] border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-3">
                    <h4 className="font-mono text-xs font-bold text-[#4daeff] truncate leading-tight">{tc.name}</h4>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{tc.folder}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded leading-none shrink-0 ${
                      tc.status === 'Failed' 
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30' 
                        : tc.status === 'Flaky' 
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {tc.status}
                    </span>
                    <span className="font-mono text-[9px] text-zinc-500">{tc.duration}</span>
                  </div>
                </div>

                {/* Execution sparkline representation */}
                <div className="flex items-end gap-0.5 mt-1 h-3 cursor-help" title="Historical run status pipeline sparkline">
                  {[...Array(10)].map((_, i) => {
                    const isErrIdx = i === 6 || i === 8 || i === 9;
                    const isFlakyIdx = i === 4;
                    return (
                      <div 
                        key={i} 
                        className={`w-2 h-full rounded-[1px] ${
                          tc.status === 'Failed' && isErrIdx 
                            ? 'bg-red-500' 
                            : tc.status === 'Flaky' && isFlakyIdx 
                            ? 'bg-amber-500'
                            : 'bg-zinc-800 hover:bg-[#4daeff]/50'
                        }`}
                        style={{ height: `${20 + (i * 8) % 80}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Right Column: Detail Pane (Comprehensive execution logs, error output, diffs) */}
      <aside className="w-[450px] flex-col h-full bg-[#101010] flex shrink-0">
        {/* Detail Header */}
        <div className="p-4 border-b border-[#262626]">
          <div className="flex justify-between items-start mb-3">
            <span className={`px-2 py-0.5 rounded-sm font-mono text-[9px] uppercase font-bold border ${
              selectedTest.status === 'Failed' 
                ? 'bg-red-500/15 text-red-400 border-red-500/30' 
                : selectedTest.status === 'Flaky'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {selectedTest.status}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={handleRetryTest}
                disabled={isRetrying}
                className="px-2.5 py-1 border border-[#262626] rounded text-[10px] font-mono uppercase font-bold hover:border-[#4daeff] text-zinc-300 hover:text-[#4daeff] bg-transparent flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={11} className={isRetrying ? 'animate-spin' : ''} />
                {isRetrying ? 'Executing' : 'Retry'}
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${selectedTest.folder}/${selectedTest.name}`);
                  if (onShowToast) onShowToast("Simulation: Source code file path copied to clipboard!", "success");
                }}
                className="px-2.5 py-1 border border-[#262626] rounded text-[10px] font-mono uppercase font-bold hover:border-[#4daeff] text-zinc-300 hover:text-[#4daeff] bg-transparent flex items-center gap-1 transition-colors"
              >
                <Code size={11} /> Code
              </button>
            </div>
          </div>

          <h2 className="text-sm font-bold text-white break-all leading-tight mb-2">{selectedTest.name}</h2>
          
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
            <span className="flex items-center gap-1 leading-none"><FolderOpen size={12} /> {selectedTest.folder}</span>
            <span className="flex items-center gap-1 leading-none"><Clock size={12} /> {selectedTest.duration}</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#262626] bg-[#0d0d0d]">
          {(['Error', 'History', 'Metrics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveDetailTab(tab)}
              className={`px-4 py-2.5 font-mono text-[9px] uppercase font-bold tracking-wider relative transition-colors ${
                activeDetailTab === tab ? 'text-[#4daeff]' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab === 'Error' ? 'Error Output' : tab}
              {activeDetailTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4daeff]" />
              )}
            </button>
          ))}
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0d0d0d] space-y-4">
          {activeDetailTab === 'Error' && (
            <>
              {selectedTest.errorMsg ? (
                <>
                  {/* Trace Alert block */}
                  <div className="border border-red-500/30 bg-red-500/5 p-3 relative group rounded flex flex-col gap-3">
                    <button 
                      onClick={() => { 
                        navigator.clipboard.writeText(selectedTest.errorMsg || ''); 
                        if (onShowToast) onShowToast("Log copied to clipboard!", "success"); 
                      }}
                      className="absolute right-2 top-2 p-1 text-zinc-500 hover:text-white transition-opacity"
                    >
                      <Copy size={12} />
                    </button>
                    <div>
                      <h4 className="font-mono text-xs font-bold text-red-400 leading-normal">{selectedTest.errorMsg}</h4>
                      <pre className="font-mono text-[10px] text-zinc-500 leading-relaxed mt-3 whitespace-pre-wrap">
                        {selectedTest.stackTrace}
                      </pre>
                    </div>

                    {onTriggerAi && (
                      <button
                        onClick={() => {
                          onTriggerAi(`Review failed test case "${selectedTest.name}" in folder "${selectedTest.folder}". Error: "${selectedTest.errorMsg}". Stacktrace:\n${selectedTest.stackTrace || 'No stack trace captured.'}\n\nPlease isolate the root cause, recommend fix modifications, and outline a resolution pipeline.`);
                        }}
                        className="py-1.5 bg-[#4daeff]/10 hover:bg-[#4daeff]/20 border border-[#4daeff]/30 hover:border-[#4daeff]/50 text-[#4daeff] text-[10px] font-mono font-bold rounded uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Sparkles size={12} /> Diagnose with Google Chrome AI
                      </button>
                    )}
                  </div>

                  {/* Simplified Git Diff Panel */}
                  {selectedTest.diff && (
                    <div className="border border-[#262626] bg-[#101010] rounded overflow-hidden">
                      <div className="px-3 py-1.5 border-b border-[#262626] bg-[#141414] text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                        Object Diff
                      </div>
                      <div className="p-3 font-mono text-[10px] leading-relaxed select-all">
                        <div className="text-zinc-500">{"{"}</div>
                        <div className="text-zinc-400">&nbsp;&nbsp;"id": "usr_12345",</div>
                        <div className="text-zinc-400">&nbsp;&nbsp;"email": "test@example.com",</div>
                        <div className="bg-red-500/15 text-red-400 px-1 border-l-2 border-l-red-500">&nbsp;&nbsp;- "status": "pending"</div>
                        <div className="bg-[#4caf50]/15 text-[#4caf50] px-1 border-l-2 border-l-[#4caf50]">&nbsp;&nbsp;+ "status": "active"</div>
                        <div className="bg-[#4caf50]/15 text-[#4caf50] px-1 border-l-2 border-l-[#4caf50]">&nbsp;&nbsp;+ "token": "ey..."</div>
                        <div className="text-zinc-500">{"}"}</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-8 text-zinc-500 text-xs">
                  This test case successfully completed execution without emitting any assertions or warning telemetry logs.
                </div>
              )}

              {/* Execution Context table data */}
              <div className="border border-[#262626] bg-[#101010] rounded overflow-hidden">
                <div className="px-3 py-1.5 border-b border-[#262626] bg-[#141414] text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                  Execution Context
                </div>
                <div className="divide-y divide-[#262626]">
                  <div className="flex text-xs">
                    <div className="w-1/3 p-2.5 border-r border-[#262626] font-mono text-[10px] text-zinc-500 uppercase font-semibold">Environment</div>
                    <div className="w-2/3 p-2.5 font-mono text-zinc-300">staging-eu-west</div>
                  </div>
                  <div className="flex text-xs">
                    <div className="w-1/3 p-2.5 border-r border-[#262626] font-mono text-[10px] text-zinc-500 uppercase font-semibold">Worker ID</div>
                    <div className="w-2/3 p-2.5 font-mono text-zinc-300">wrk-9876x</div>
                  </div>
                  <div className="flex text-xs">
                    <div className="w-1/3 p-2.5 border-r border-[#262626] font-mono text-[10px] text-zinc-500 uppercase font-semibold">Commit Hash</div>
                    <div className="w-2/3 p-2.5 font-mono text-[#4daeff] flex items-center gap-1 cursor-pointer hover:underline" onClick={() => onShowToast?.("Redirecting to git commit diff on origin branch...", "info")}>
                      <GitCommit size={12} /> a1b2c3d4
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeDetailTab === 'History' && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500">Historical Execution Logs</h3>
              <div className="space-y-2">
                {selectedTest.history?.map((h, index) => (
                  <div key={index} className="p-3 bg-[#121212] border border-[#262626] rounded flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono text-[#4daeff] font-bold block">{h.runId}</span>
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{h.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-zinc-400">{h.duration}</span>
                      <span className={`text-[9px] font-mono uppercase font-bold border px-1.5 py-0.5 rounded ${
                        h.status === 'Passed' ? 'bg-[#4caf50]/15 text-[#4caf50] border-[#4caf50]/20' : 'bg-red-500/15 text-red-400 border-red-500/20'
                      }`}>
                        {h.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDetailTab === 'Metrics' && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500">Telemetry Performance Metrics</h3>
              
              <div className="bg-[#121212] border border-[#262626] p-4 rounded text-center">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Average Execution Speed</span>
                <span className="font-mono text-2xl font-bold text-white">{selectedTest.duration}</span>
                <p className="text-[10px] text-zinc-500 mt-2">Steady execution speed over the last 14 testing pipeline evaluations.</p>
              </div>

              <div className="bg-[#121212] border border-[#262626] p-4 rounded text-center">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Failure / Flake rate (30D)</span>
                <span className="font-mono text-2xl font-bold text-red-400">{selectedTest.status === 'Passed' ? '0%' : '14.2%'}</span>
                <p className="text-[10px] text-zinc-500 mt-2">Evaluation indicates standard regression risk threshold limit status.</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
