import React, { useState, useMemo } from 'react';
import { 
  GitCompare, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Gauge, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Flame, 
  ShieldCheck, 
  Zap, 
  Terminal, 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  GitBranch,
  User,
  ExternalLink,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { BrowserDb } from '../lib/browserDb';
import { Run, TestCase } from '../types';
import { useEffect } from 'react';

interface ComparisonViewProps {
  onSelectTest?: (testId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function ComparisonView({ onSelectTest, onShowToast }: ComparisonViewProps) {
  // Real-time Database state
  const [runs, setRuns] = useState<Run[]>(BrowserDb.getRuns());
  const [testCases, setTestCases] = useState<TestCase[]>(BrowserDb.getTestCases());

  useEffect(() => {
    const handleUpdate = () => {
      setRuns(BrowserDb.getRuns());
      setTestCases(BrowserDb.getTestCases());
    };
    window.addEventListener('aware_db_update', handleUpdate);
    return () => window.removeEventListener('aware_db_update', handleUpdate);
  }, []);

  // We can choose Run A and Run B
  const [runAId, setRunAId] = useState<string>('RUN-8491-BZ'); // Baseline: 100% pass rate
  const [runBId, setRunBId] = useState<string>('RUN-8492-AX'); // Target: 82.1% pass rate (has failures and anomalies)
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'regressions' | 'fixes' | 'perf'>('all');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  // Find the Run objects
  const runA = useMemo(() => runs.find(r => r.id === runAId) || runs[0], [runAId, runs]);
  const runB = useMemo(() => runs.find(r => r.id === runBId) || runs[1], [runBId, runs]);

  // Handle setting presets
  const handlePreset = (type: 'reg' | 'sec' | 'smoke') => {
    if (type === 'reg') {
      setRunAId('RUN-8491-BZ'); // API Latency Sanity (100% passed)
      setRunBId('RUN-8492-AX'); // Payment Gateway V2 (82.1% passed, 3 failed)
    } else if (type === 'sec') {
      setRunAId('RUN-9479-sec'); // Data Sanitization (100%)
      setRunBId('RUN-9482-sec'); // Core Auth Suite (98.5%)
    } else if (type === 'smoke') {
      setRunAId('RUN-9479-sec'); // UAT Baseline
      setRunBId('RUN-9480-smk'); // Smoke Frontend Navigation
    }
    setActiveFilter('all');
    setExpandedTestId(null);
  };

  // Helper to parse duration string (e.g. "12m 45s", "450ms", "1.2s") into seconds
  const parseDurationToSeconds = (durationStr: string): number => {
    if (!durationStr || durationStr === '--') return 0;
    const cleanStr = durationStr.toLowerCase().trim();
    
    if (cleanStr.endsWith('ms')) {
      return parseFloat(cleanStr.replace('ms', '')) / 1000;
    }
    if (cleanStr.endsWith('s') && !cleanStr.includes('m')) {
      return parseFloat(cleanStr.replace('s', ''));
    }
    
    // Format: "12m 45s"
    let totalSeconds = 0;
    const minMatch = cleanStr.match(/(\d+)m/);
    const secMatch = cleanStr.match(/(\d+)s/);
    
    if (minMatch) totalSeconds += parseInt(minMatch[1], 10) * 60;
    if (secMatch) totalSeconds += parseInt(secMatch[1], 10);
    
    return totalSeconds || parseFloat(cleanStr) || 0;
  };

  // Compute stats difference
  const passRateDiff = (runB?.passRate ?? 0) - (runA?.passRate ?? 0);
  const durationASeconds = parseDurationToSeconds(runA.duration);
  const durationBSeconds = parseDurationToSeconds(runB.duration);
  const durationDiffSeconds = durationBSeconds - durationASeconds;
  
  const formatDurationDiff = (diffSec: number) => {
    const absDiff = Math.abs(diffSec);
    if (absDiff === 0) return 'No difference';
    
    let timeStr = '';
    if (absDiff >= 60) {
      const mins = Math.floor(absDiff / 60);
      const secs = Math.round(absDiff % 60);
      timeStr = `${mins}m ${secs}s`;
    } else {
      timeStr = `${absDiff.toFixed(2)}s`;
    }
    
    return diffSec > 0 ? `+${timeStr} slower` : `-${timeStr} faster`;
  };

  // Get status details of a test case for a run
  const getTestDetailsInRun = (tc: TestCase, runId: string) => {
    if (tc.runId === runId) {
      return { status: tc.status, duration: tc.duration, isPrimary: true };
    }
    const hist = tc.history?.find(h => h.runId === runId);
    if (hist) {
      return { status: hist.status, duration: hist.duration, isPrimary: false };
    }
    return { status: 'Skipped' as const, duration: '--', isPrimary: false, notRun: true };
  };

  // Compile test cases list that run in either A or B
  const comparedTests = useMemo(() => {
    return testCases.map(tc => {
      const detailsA = getTestDetailsInRun(tc, runAId);
      const detailsB = getTestDetailsInRun(tc, runBId);
      
      const durASec = parseDurationToSeconds(detailsA.duration);
      const durBSec = parseDurationToSeconds(detailsB.duration);
      
      let durPercentChange = 0;
      if (durASec > 0) {
        durPercentChange = ((durBSec - durASec) / durASec) * 100;
      }

      // Check if it's a regression (passed/flaky in A, but failed in B; or passed in A, but flaky in B)
      const isRegression = 
        (detailsA.status === 'Passed' && (detailsB.status === 'Failed' || detailsB.status === 'Flaky')) ||
        (detailsA.status === 'Flaky' && detailsB.status === 'Failed');

      // Check if it's a fix (failed/flaky in A, but passed in B)
      const isFix = 
        ((detailsA.status === 'Failed' || detailsA.status === 'Flaky') && detailsB.status === 'Passed') ||
        (detailsA.status === 'Failed' && detailsB.status === 'Flaky');

      // Check if performance is significantly degraded (> 15% slow down)
      const isPerfDiff = durPercentChange > 15 && durASec > 0.1 && durBSec > 0.1;

      return {
        testCase: tc,
        detailsA,
        detailsB,
        isRegression,
        isFix,
        isPerfDiff,
        durPercentChange,
        activeInEither: !detailsA.notRun || !detailsB.notRun
      };
    }).filter(item => {
      // Must be present in at least one of the runs
      if (!item.activeInEither) return false;

      // Filter based on active view tab
      if (activeFilter === 'regressions' && !item.isRegression) return false;
      if (activeFilter === 'fixes' && !item.isFix) return false;
      if (activeFilter === 'perf' && !item.isPerfDiff) return false;

      // Filter based on text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.testCase.name.toLowerCase().includes(query) ||
          item.testCase.folder.toLowerCase().includes(query) ||
          item.testCase.id.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [runAId, runBId, activeFilter, searchQuery, testCases]);

  const stats = useMemo(() => {
    let regressionsCount = 0;
    let fixesCount = 0;
    let perfDegradedCount = 0;

    testCases.forEach(tc => {
      const detailsA = getTestDetailsInRun(tc, runAId);
      const detailsB = getTestDetailsInRun(tc, runBId);
      
      const durASec = parseDurationToSeconds(detailsA.duration);
      const durBSec = parseDurationToSeconds(detailsB.duration);

      const isReg = (detailsA.status === 'Passed' && (detailsB.status === 'Failed' || detailsB.status === 'Flaky')) ||
                    (detailsA.status === 'Flaky' && detailsB.status === 'Failed');
      const isFx = ((detailsA.status === 'Failed' || detailsA.status === 'Flaky') && detailsB.status === 'Passed') ||
                   (detailsA.status === 'Failed' && detailsB.status === 'Flaky');
      
      const pDiff = durASec > 0 && ((durBSec - durASec) / durASec) * 100 > 15 && durASec > 0.1;

      if (isReg) regressionsCount++;
      if (isFx) fixesCount++;
      if (pDiff) perfDegradedCount++;
    });

    return { regressionsCount, fixesCount, perfDegradedCount };
  }, [runAId, runBId, testCases]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Passed': return <CheckCircle size={14} className="text-[#4caf50]" />;
      case 'Failed': return <XCircle size={14} className="text-red-500" />;
      case 'Flaky': return <AlertTriangle size={14} className="text-amber-500" />;
      case 'Skipped': return <Info size={14} className="text-zinc-500" />;
      default: return <Info size={14} className="text-zinc-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Passed':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/20">Passed</span>;
      case 'Failed':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Failed</span>;
      case 'Flaky':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Flaky</span>;
      case 'Skipped':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">Not Run</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">{status}</span>;
    }
  };

  const getStatusTextClass = (status: string) => {
    switch (status) {
      case 'Passed': return 'text-[#4caf50]';
      case 'Failed': return 'text-red-400';
      case 'Flaky': return 'text-amber-400';
      default: return 'text-zinc-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c0c0c] text-zinc-100 select-none font-sans" id="comparison-view-container">
      {/* Banner Controls Panel */}
      <div className="p-4 bg-[#111111] border-b border-[#262626] flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
              <GitCompare size={20} className="text-[#4daeff]" /> Telemetry Comparison Studio
            </h2>
            <p className="text-xs text-zinc-400">
              Diff and analyze results, duration deltas, and log diagnostics across test pipelines side-by-side.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Quick Presets:</span>
            <button 
              id="preset-regression"
              onClick={() => handlePreset('reg')}
              className={`px-2.5 py-1 text-xs font-semibold rounded border transition-all ${
                runAId === 'RUN-8491-BZ' && runBId === 'RUN-8492-AX'
                  ? 'bg-[#4daeff]/10 text-[#4daeff] border-[#4daeff]/30'
                  : 'bg-[#181818] text-zinc-300 border-[#2b2b2b] hover:bg-[#202020]'
              }`}
            >
              Regression Analysis
            </button>
            <button 
              id="preset-security"
              onClick={() => handlePreset('sec')}
              className={`px-2.5 py-1 text-xs font-semibold rounded border transition-all ${
                runAId === 'RUN-9479-sec' && runBId === 'RUN-9482-sec'
                  ? 'bg-[#4daeff]/10 text-[#4daeff] border-[#4daeff]/30'
                  : 'bg-[#181818] text-zinc-300 border-[#2b2b2b] hover:bg-[#202020]'
              }`}
            >
              Security Audits
            </button>
            <button 
              id="preset-smoke"
              onClick={() => handlePreset('smoke')}
              className={`px-2.5 py-1 text-xs font-semibold rounded border transition-all ${
                runAId === 'RUN-9479-sec' && runBId === 'RUN-9480-smk'
                  ? 'bg-[#4daeff]/10 text-[#4daeff] border-[#4daeff]/30'
                  : 'bg-[#181818] text-zinc-300 border-[#2b2b2b] hover:bg-[#202020]'
              }`}
            >
              Smoke vs UAT
            </button>
          </div>
        </div>

        {/* Dropdown selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* RUN A */}
          <div className="flex flex-col gap-1.5" id="run-a-select-block">
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#4daeff]"></span>
              Primary Baseline (Run A)
            </label>
            <div className="relative">
              <select 
                id="select-run-a"
                value={runAId}
                onChange={(e) => { setRunAId(e.target.value); setExpandedTestId(null); }}
                className="w-full bg-[#181818] border border-[#2b2b2b] rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#4daeff]/50 transition-colors appearance-none cursor-pointer"
              >
                {runs.map(run => (
                  <option key={run.id} value={run.id} disabled={run.id === runBId}>
                    {run.id} • {run.name} ({run.environment} - {(run?.passRate ?? 0)}% Pass)
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {/* RUN B */}
          <div className="flex flex-col gap-1.5" id="run-b-select-block">
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              Comparison Target (Run B)
            </label>
            <div className="relative">
              <select 
                id="select-run-b"
                value={runBId}
                onChange={(e) => { setRunBId(e.target.value); setExpandedTestId(null); }}
                className="w-full bg-[#181818] border border-[#2b2b2b] rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
              >
                {runs.map(run => (
                  <option key={run.id} value={run.id} disabled={run.id === runAId}>
                    {run.id} • {run.name} ({run.environment} - {(run?.passRate ?? 0)}% Pass)
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Scrollable Workspace */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Bento Grid Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" id="bento-comparison-metrics">
          {/* Card 1: Pass Rate Comparison */}
          <div className="bg-[#121212] border border-[#262626] rounded-lg p-3 flex flex-col justify-between hover:border-zinc-700 transition-all duration-200">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">Pass Rate Change</span>
              <Gauge size={16} className="text-[#4daeff]" />
            </div>
            
            <div className="mt-4 flex items-end gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-mono">Run A</span>
                <span className="text-lg font-bold text-zinc-300">{(runA?.passRate ?? 0)}%</span>
              </div>
              <ArrowRight size={14} className="text-zinc-600 mb-1" />
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-mono">Run B</span>
                <span className={`text-2xl font-black ${(runB?.passRate ?? 0) >= (runA?.passRate ?? 0) ? 'text-[#4caf50]' : 'text-red-400'}`}>
                  {(runB?.passRate ?? 0)}%
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-[#1f1f1f] flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">Delta Variance</span>
              <span className={`text-xs font-mono font-bold flex items-center ${passRateDiff >= 0 ? 'text-[#4caf50]' : 'text-red-400'}`}>
                {passRateDiff >= 0 ? '+' : ''}{passRateDiff.toFixed(1)}% 
                {passRateDiff >= 0 ? <TrendingUp size={12} className="ml-0.5" /> : <TrendingDown size={12} className="ml-0.5" />}
              </span>
            </div>
          </div>

          {/* Card 2: Duration Comparison */}
          <div className="bg-[#121212] border border-[#262626] rounded-lg p-3 flex flex-col justify-between hover:border-zinc-700 transition-all duration-200">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">Duration Shift</span>
              <Clock size={16} className="text-[#4daeff]" />
            </div>

            <div className="mt-4 flex items-end gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-mono">Run A</span>
                <span className="text-lg font-bold text-zinc-300">{runA.duration}</span>
              </div>
              <ArrowRight size={14} className="text-zinc-600 mb-1" />
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-mono">Run B</span>
                <span className={`text-2xl font-black ${durationDiffSeconds <= 0 ? 'text-[#4caf50]' : 'text-amber-400'}`}>
                  {runB.duration}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-[#1f1f1f] flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">Execution Delta</span>
              <span className={`text-xs font-mono font-semibold ${durationDiffSeconds <= 0 ? 'text-[#4caf50]' : 'text-amber-400'}`}>
                {formatDurationDiff(durationDiffSeconds)}
              </span>
            </div>
          </div>

          {/* Card 3: Test Count & Volumes */}
          <div className="bg-[#121212] border border-[#262626] rounded-lg p-3 flex flex-col justify-between hover:border-zinc-700 transition-all duration-200">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">Test Scale Diff</span>
              <Layers size={16} className="text-emerald-400" />
            </div>

            <div className="mt-4 flex items-end gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-mono">Run A</span>
                <span className="text-lg font-semibold text-zinc-300">{runA.testsCount} tests</span>
              </div>
              <ArrowRight size={14} className="text-zinc-600 mb-1" />
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-mono">Run B</span>
                <span className="text-2xl font-bold text-zinc-100">{runB.testsCount} tests</span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-[#1f1f1f] flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">Total Volume Delta</span>
              <span className="text-xs font-mono font-bold text-zinc-300">
                {runB.testsCount - runA.testsCount >= 0 ? '+' : ''}{runB.testsCount - runA.testsCount} tests
              </span>
            </div>
          </div>

          {/* Card 4: Diagnostics Summary */}
          <div className="bg-[#121212] border border-[#262626] rounded-lg p-3 flex flex-col justify-between hover:border-zinc-700 transition-all duration-200">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">Status Anomalies</span>
              <Flame size={16} className="text-red-400" />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-center bg-[#171717] p-2 rounded border border-[#222]">
              <div>
                <div className="text-[10px] text-zinc-500 font-mono">Regressions</div>
                <div className={`text-lg font-black ${stats.regressionsCount > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                  {stats.regressionsCount}
                </div>
              </div>
              <div className="border-l border-[#262626]">
                <div className="text-[10px] text-zinc-500 font-mono">Fixed Tests</div>
                <div className={`text-lg font-black ${stats.fixesCount > 0 ? 'text-[#4caf50]' : 'text-zinc-400'}`}>
                  {stats.fixesCount}
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-1.5 border-t border-[#1f1f1f] flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">Perf Degradations</span>
              <span className={`text-xs font-mono font-semibold ${stats.perfDegradedCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                {stats.perfDegradedCount} tests slow
              </span>
            </div>
          </div>
        </div>

        {/* Side-by-side run metadata cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="metadata-comparison-details">
          {/* Baseline metadata */}
          <div className="bg-[#101010] border border-[#262626] rounded-lg p-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#4daeff]"></div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-300">Primary Baseline Run Profile</h3>
              <span className="font-mono text-[10px] text-[#4daeff] bg-[#4daeff]/10 px-2 py-0.5 rounded border border-[#4daeff]/20">{runA.id}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Suite Name</span>
                <span className="text-zinc-300 font-semibold truncate">{runA.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Environment</span>
                <span className="text-zinc-300 font-semibold">{runA.environment}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Branch / Ref</span>
                <span className="text-zinc-300 flex items-center gap-1 truncate text-xs">
                  <GitBranch size={12} className="text-zinc-500" /> {runA.branch}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Triggered By</span>
                <span className="text-zinc-300 flex items-center gap-1 text-xs">
                  <User size={12} className="text-zinc-500" /> {runA.triggeredBy}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Commit Reference</span>
                <span className="text-zinc-400 font-mono text-xs">{runA.commit || 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Timestamp</span>
                <span className="text-zinc-400 text-xs">{runA.timestamp}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1e1e1e] flex justify-between text-xs font-mono">
              <span className="text-zinc-500">Execution Breakdown:</span>
              <span className="text-zinc-300">
                Passed: <strong className="text-[#4caf50]">{runA.passedCount}</strong> | 
                Failed: <strong className="text-red-400">{runA.failedCount}</strong> | 
                Skipped: <strong className="text-zinc-500">{runA.skippedCount}</strong>
              </span>
            </div>
          </div>

          {/* Target metadata */}
          <div className="bg-[#101010] border border-[#262626] rounded-lg p-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-300">Comparison Target Run Profile</h3>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{runB.id}</span>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Suite Name</span>
                <span className="text-zinc-300 font-semibold truncate">{runB.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Environment</span>
                <span className="text-zinc-300 font-semibold">{runB.environment}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Branch / Ref</span>
                <span className="text-zinc-300 flex items-center gap-1 truncate text-xs">
                  <GitBranch size={12} className="text-zinc-500" /> {runB.branch}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Triggered By</span>
                <span className="text-zinc-300 flex items-center gap-1 text-xs">
                  <User size={12} className="text-zinc-500" /> {runB.triggeredBy}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Commit Reference</span>
                <span className="text-zinc-400 font-mono text-xs">{runB.commit || 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Timestamp</span>
                <span className="text-zinc-400 text-xs">{runB.timestamp}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1e1e1e] flex justify-between text-xs font-mono">
              <span className="text-zinc-500">Execution Breakdown:</span>
              <span className="text-zinc-300">
                Passed: <strong className="text-[#4caf50]">{runB.passedCount}</strong> | 
                Failed: <strong className="text-red-400">{runB.failedCount}</strong> | 
                Skipped: <strong className="text-zinc-500">{runB.skippedCount}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Test Matrix Diff Table */}
        <div className="bg-[#101010] border border-[#262626] rounded-lg flex flex-col overflow-hidden" id="compared-tests-matrix-container">
          <div className="p-4 border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141414]">
            <div className="flex flex-col">
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-300">Test Cases Status Matrix Diff</h3>
              <p className="text-[11px] text-zinc-500">Analyzing matching test executions and tracking state mutations.</p>
            </div>

            {/* Filters & Search Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Tabs */}
              <div className="flex bg-[#1c1c1c] p-0.5 rounded border border-[#2b2b2b] text-xs font-medium">
                <button 
                  onClick={() => { setActiveFilter('all'); setExpandedTestId(null); }}
                  className={`px-2.5 py-1 rounded transition-colors ${activeFilter === 'all' ? 'bg-[#2a2a2a] text-[#4daeff] font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  All ({comparedTests.filter(t => t.activeInEither).length})
                </button>
                <button 
                  onClick={() => { setActiveFilter('regressions'); setExpandedTestId(null); }}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${activeFilter === 'regressions' ? 'bg-red-950 text-red-400 font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Regressions ({stats.regressionsCount})
                </button>
                <button 
                  onClick={() => { setActiveFilter('fixes'); setExpandedTestId(null); }}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${activeFilter === 'fixes' ? 'bg-emerald-950/50 text-[#4caf50] font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Fixes ({stats.fixesCount})
                </button>
                <button 
                  onClick={() => { setActiveFilter('perf'); setExpandedTestId(null); }}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${activeFilter === 'perf' ? 'bg-amber-950/30 text-amber-400 font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Perf Diffs ({stats.perfDegradedCount})
                </button>
              </div>

              {/* Text Search */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Search comparison tests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#1c1c1c] border border-[#2b2b2b] rounded pl-8 pr-3 py-1 text-xs text-zinc-300 outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600 w-44"
                />
              </div>
            </div>
          </div>

          {comparedTests.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs font-mono">
              No matching test cases found with current filters or search queries.
            </div>
          ) : (
            <div className="divide-y divide-[#202020] overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#131313] border-b border-[#202020] text-zinc-400 font-mono text-[10px] uppercase tracking-widest font-bold">
                    <th className="p-3">Test Name & Location</th>
                    <th className="p-3">Run A Status</th>
                    <th className="p-3">Run B Status</th>
                    <th className="p-3 text-center">Trend / Mutation</th>
                    <th className="p-3">Duration (A → B)</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-[#1b1b1b]">
                  {comparedTests.map((item) => {
                    const { testCase, detailsA, detailsB, isRegression, isFix, durPercentChange } = item;
                    const isExpanded = expandedTestId === testCase.id;

                    return (
                      <React.Fragment key={testCase.id}>
                        <tr 
                          id={`row-${testCase.id}`}
                          onClick={() => setExpandedTestId(isExpanded ? null : testCase.id)}
                          className={`hover:bg-[#151515] transition-colors cursor-pointer ${
                            isRegression ? 'bg-red-500/5 hover:bg-red-500/10' : 
                            isFix ? 'bg-[#4caf50]/5 hover:bg-[#4caf50]/10' : ''
                          }`}
                        >
                          {/* Test name & location */}
                          <td className="p-3 max-w-[280px]">
                            <div className="font-semibold text-zinc-200 truncate">{testCase.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono truncate">{testCase.folder}</div>
                          </td>

                          {/* Run A status badge */}
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(detailsA.status)}
                              <span className={`font-mono text-xs ${getStatusTextClass(detailsA.status)}`}>
                                {detailsA.status === 'Skipped' ? 'Not Run' : detailsA.status}
                              </span>
                            </div>
                          </td>

                          {/* Run B status badge */}
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(detailsB.status)}
                              <span className={`font-mono text-xs ${getStatusTextClass(detailsB.status)}`}>
                                {detailsB.status === 'Skipped' ? 'Not Run' : detailsB.status}
                              </span>
                            </div>
                          </td>

                          {/* Trend status mutation indicator */}
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center justify-center">
                              {isRegression ? (
                                <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-500/30 text-red-400 font-mono font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                                  Regression <TrendingDown size={10} />
                                </span>
                              ) : isFix ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-[#4caf50] font-mono font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                                  Resolved <TrendingUp size={10} />
                                </span>
                              ) : detailsA.status === detailsB.status ? (
                                <span className="text-zinc-600 font-mono text-[10px]">— Unchanged</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                                  Shift <ArrowRight size={10} />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Duration diff */}
                          <td className="p-3 font-mono text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-500">{detailsA.duration}</span>
                              <ArrowRight size={10} className="text-zinc-600" />
                              <span className="text-zinc-300 font-bold">{detailsB.duration}</span>
                              
                              {detailsA.duration !== '--' && detailsB.duration !== '--' && durPercentChange !== 0 && (
                                <span className={`text-[10px] font-bold flex items-center ml-1 ${durPercentChange > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {durPercentChange > 0 ? '+' : ''}{durPercentChange.toFixed(0)}%
                                  {durPercentChange > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action toggle details button */}
                          <td className="p-3 text-right">
                            <button 
                              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#202020] transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedTestId(isExpanded ? null : testCase.id);
                              }}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Side-by-Side Test Diff Row */}
                        {isExpanded && (
                          <tr id={`expanded-info-${testCase.id}`} className="bg-[#131313]">
                            <td colSpan={6} className="p-4 border-t border-[#222]">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Error diagnostic in A */}
                                <div className="bg-[#0b0b0b] border border-[#222] rounded p-3 text-xs">
                                  <div className="flex items-center justify-between border-b border-[#1b1b1b] pb-2 mb-2 font-mono text-[10px] uppercase text-zinc-500">
                                    <span>Run A Diagnostic Log ({runAId})</span>
                                    {getStatusBadge(detailsA.status)}
                                  </div>
                                  
                                  {detailsA.status === 'Failed' || detailsA.status === 'Flaky' ? (
                                    <div className="space-y-2">
                                      <div className="text-red-400 font-mono font-semibold select-text break-words bg-red-950/10 p-2 border border-red-900/20 rounded">
                                        {testCase.errorMsg || "Process failed with unhandled exception."}
                                      </div>
                                      <div className="text-zinc-500 font-mono text-[10px] whitespace-pre-wrap select-text max-h-[160px] overflow-y-auto bg-black p-2 rounded">
                                        {testCase.stackTrace || "No trace available."}
                                      </div>
                                    </div>
                                  ) : detailsA.notRun ? (
                                    <div className="text-zinc-500 italic py-4 text-center">
                                      This test was not executed in the baseline run.
                                    </div>
                                  ) : (
                                    <div className="text-[#4caf50] font-mono py-4 text-center flex items-center justify-center gap-1.5 bg-[#4caf50]/5 rounded border border-[#4caf50]/10">
                                      <CheckCircle size={14} /> Passed cleanly in {detailsA.duration}
                                    </div>
                                  )}
                                </div>

                                {/* Error diagnostic in B */}
                                <div className="bg-[#0b0b0b] border border-[#222] rounded p-3 text-xs">
                                  <div className="flex items-center justify-between border-b border-[#1b1b1b] pb-2 mb-2 font-mono text-[10px] uppercase text-zinc-500">
                                    <span>Run B Diagnostic Log ({runBId})</span>
                                    {getStatusBadge(detailsB.status)}
                                  </div>

                                  {detailsB.status === 'Failed' || detailsB.status === 'Flaky' ? (
                                    <div className="space-y-2">
                                      <div className="text-red-400 font-mono font-semibold select-text break-words bg-red-950/10 p-2 border border-red-900/20 rounded">
                                        {testCase.errorMsg || "Process failed with unhandled exception."}
                                      </div>
                                      <div className="text-zinc-500 font-mono text-[10px] whitespace-pre-wrap select-text max-h-[160px] overflow-y-auto bg-black p-2 rounded">
                                        {testCase.stackTrace || "No trace available."}
                                      </div>
                                      
                                      {/* Side by side diff visualizer */}
                                      {testCase.diff && (
                                        <div className="mt-2 border border-[#2d1212] rounded overflow-hidden">
                                          <div className="bg-[#241111] p-1.5 text-[9px] font-mono text-red-300 font-semibold border-b border-[#311717]">
                                            Failure Assertion JSON Diff
                                          </div>
                                          <div className="grid grid-cols-2 divide-x divide-[#2a1313] text-[9px] font-mono bg-[#140b0b]">
                                            <div className="p-2">
                                              <span className="text-zinc-500 block font-bold mb-1 uppercase tracking-wider text-[8px]">Expected:</span>
                                              <pre className="whitespace-pre-wrap text-emerald-400 select-text">{testCase.diff.expected}</pre>
                                            </div>
                                            <div className="p-2">
                                              <span className="text-zinc-500 block font-bold mb-1 uppercase tracking-wider text-[8px]">Actual:</span>
                                              <pre className="whitespace-pre-wrap text-red-400 select-text">{testCase.diff.actual}</pre>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : detailsB.notRun ? (
                                    <div className="text-zinc-500 italic py-4 text-center">
                                      This test was not executed in the target comparison run.
                                    </div>
                                  ) : (
                                    <div className="text-[#4caf50] font-mono py-4 text-center flex items-center justify-center gap-1.5 bg-[#4caf50]/5 rounded border border-[#4caf50]/10">
                                      <CheckCircle size={14} /> Passed cleanly in {detailsB.duration}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* External deep link */}
                              <div className="mt-3 flex justify-between items-center text-[11px] font-mono text-zinc-500 bg-[#191919] p-2 rounded border border-[#222]">
                                <span className="flex items-center gap-1.5">
                                  <Terminal size={12} className="text-zinc-400" /> Suite ID: <strong>{testCase.suiteId}</strong> | Priority: <strong>{testCase.priority}</strong>
                                </span>
                                {onSelectTest && (
                                  <button 
                                    onClick={() => onSelectTest(testCase.id)}
                                    className="text-[#4daeff] hover:underline flex items-center gap-1 font-bold"
                                  >
                                    View full test history <ExternalLink size={10} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
