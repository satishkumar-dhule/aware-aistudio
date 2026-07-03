import React, { useState } from 'react';
import { 
  Folder, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  X, 
  Users, 
  Settings2, 
  ChevronRight,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';
import { initialSuites, initialTestCases } from '../data';
import { Suite, TestCase } from '../types';

interface SuitesViewProps {
  onSelectTest: (testId: string) => void;
  activeEnv: 'All' | 'QA' | 'UAT' | 'PROD';
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function SuitesView({ onSelectTest, activeEnv, onShowToast }: SuitesViewProps) {
  const [suites, setSuites] = useState<Suite[]>(initialSuites);

  const filteredSuites = suites.filter((suite) => {
    if (activeEnv === 'All') return true;
    const suiteEnv = suite.environment === 'Prod' ? 'PROD' : suite.environment.toUpperCase();
    return suiteEnv === activeEnv.toUpperCase();
  });
  const [selectedSuite, setSelectedSuite] = useState<Suite | null>(null);

  const getHeatmapColor = (status: string) => {
    switch (status) {
      case 'Passed': return 'bg-[#2e7d32] hover:bg-[#388e3c] border-t-2 border-[#4caf50]/20';
      case 'Failed': return 'bg-[#c62828] hover:bg-[#d32f2f] border-t-2 border-[#ef5350]/20';
      case 'Flaky': return 'bg-[#ef6c00] hover:bg-[#f57c00] border-t-2 border-[#ff9800]/20';
      default: return 'bg-zinc-800 border-t-2 border-zinc-700';
    }
  };

  const handleBulkRetry = (suiteName: string) => {
    if (onShowToast) {
      onShowToast(`Bulk retry triggered for all tests in Suite: ${suiteName}. Re-initiating container cluster...`, 'info');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0c0c0c] select-none font-sans flex">
      {/* Primary Suites Grid list */}
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">TestSuite Suites</h2>
          <p className="text-zinc-500 text-xs mt-1">Grouped configurations containing testing modules and automation maps.</p>
        </div>

        {/* Suites Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredSuites.map((suite) => (
            <div 
              key={suite.id}
              onClick={() => setSelectedSuite(suite)}
              className={`p-5 rounded bg-[#131313] border cursor-pointer transition-all duration-150 group relative overflow-hidden ${
                selectedSuite?.id === suite.id 
                  ? 'border-[#4daeff] bg-[#1a1a1a]' 
                  : 'border-[#262626] hover:border-[#4daeff]/40'
              }`}
            >
              {/* Card top banner */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-zinc-500">{suite.environment}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                    <span className="text-[10px] font-mono uppercase font-bold text-[#4daeff]">{suite.category}</span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#4daeff] transition-colors">{suite.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-white block">{suite.totalTests} Tests</span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">{suite.duration}</span>
                </div>
              </div>

              {/* Stability meter bar */}
              <div className="space-y-1.5 mb-5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-medium">30D Reliability Index</span>
                  <span className={`font-mono font-bold ${
                    suite.stability30d >= 95 ? 'text-[#81c784]' : suite.stability30d >= 85 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {suite.stability30d}% Stability
                  </span>
                </div>
                <div className="h-1.5 bg-[#262626] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      suite.stability30d >= 95 ? 'bg-[#4caf50]' : suite.stability30d >= 85 ? 'bg-amber-500' : 'bg-red-500'
                    }`} 
                    style={{ width: `${suite.stability30d}%` }} 
                  />
                </div>
              </div>

              {/* Spark history heatmap bar (last 20 runs) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-500 block">Historic Run Heatmap (Last 20)</span>
                <div className="flex gap-0.5 h-4">
                  {suite.heatmapHistory.map((status, index) => (
                    <div 
                      key={index}
                      className={`flex-1 rounded-[1px] ${getHeatmapColor(status)}`}
                      title={`Run #${9480 - (20 - index)}: ${status}`}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#262626]/40 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>Created: Oct 2025</span>
                <span className="text-[#4daeff] font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                  View Cases <ChevronRight size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Side Slide-out Drawer for Suite Details */}
      {selectedSuite && (
        <aside className="w-[330px] bg-[#111111] border-l border-[#222222] shrink-0 h-full flex flex-col ml-4 animate-fade-in">
          {/* Drawer header */}
          <div className="p-3 bg-[#151515] border-b border-[#222222] flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-zinc-500">Suite Scope</span>
              <h3 className="text-xs font-bold text-white mt-0.5 break-all pr-2">{selectedSuite.name}</h3>
            </div>
            <button 
              onClick={() => setSelectedSuite(null)}
              className="w-6 h-6 rounded hover:bg-[#1c1c1c] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Drawer Aggregated Stats */}
          <div className="p-3 bg-[#0d0d0d] border-b border-[#222222] grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-[#131313] border border-[#222222] rounded text-center">
              <span className="text-[9px] font-mono text-zinc-500 uppercase font-semibold block">Total Tests</span>
              <span className="font-mono text-base font-bold text-white mt-0.5 block">{selectedSuite.totalTests}</span>
            </div>
            <div className="p-2.5 bg-[#131313] border border-[#222222] rounded text-center">
              <span className="text-[9px] font-mono text-zinc-500 uppercase font-semibold block">30D Stability</span>
              <span className="font-mono text-base font-bold text-[#81c784] mt-0.5 block">{selectedSuite.stability30d}%</span>
            </div>
          </div>

          {/* Test cases list in suite */}
          <div className="flex-1 overflow-y-auto p-3 bg-[#0d0d0d] space-y-2.5">
            <h4 className="text-[10px] font-mono uppercase font-bold text-zinc-500 tracking-wider">Associated Test Cases</h4>
            <div className="space-y-1.5">
              {initialTestCases.map((tc) => (
                <div 
                  key={tc.id}
                  onClick={() => onSelectTest(tc.id)}
                  className="p-2 bg-[#121212] border border-[#222222] hover:bg-[#1a1a1a] cursor-pointer rounded flex justify-between items-center group"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs text-zinc-300 font-mono block truncate group-hover:text-[#4daeff] transition-colors">{tc.name}</span>
                    <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">{tc.duration}</span>
                  </div>
                  <span className={`text-[8px] font-mono uppercase font-bold border px-1.5 py-0.5 rounded ${
                    tc.status === 'Passed' 
                      ? 'bg-[#4caf50]/10 text-[#4caf50] border-[#4caf50]/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {tc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bulk Action Controls */}
          <div className="p-3 bg-[#151515] border-t border-[#222222] space-y-1.5">
            <button 
              onClick={() => handleBulkRetry(selectedSuite.name)}
              className="w-full py-1.5 bg-[#4daeff] hover:bg-[#66baff] text-black rounded font-mono text-[9px] uppercase font-bold transition-all"
            >
              Bulk Execute Suite Tests
            </button>
            <button 
              onClick={() => onShowToast?.("Mock: Opened suite configuration variables manager!", "info")}
              className="w-full py-1.5 bg-transparent hover:bg-zinc-800 text-zinc-300 border border-[#222222] rounded font-mono text-[9px] uppercase font-bold transition-all flex justify-center items-center gap-1"
            >
              <Settings2 size={11} /> Configure Suite Parameters
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
