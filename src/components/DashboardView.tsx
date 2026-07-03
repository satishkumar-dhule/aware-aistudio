import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  Layers, 
  AlertTriangle, 
  ChevronRight, 
  TrendingUp, 
  Eye,
  GitCompare,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { BrowserDb } from '../lib/browserDb';
import { Suite } from '../types';

interface DashboardViewProps {
  onNavigateToTab: (tab: any) => void;
  onSelectTest: (testId: string) => void;
  activeEnv: 'All' | 'QA' | 'UAT' | 'PROD';
  onTriggerAi?: (prompt: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function DashboardView({ onNavigateToTab, onSelectTest, activeEnv, onTriggerAi, onShowToast }: DashboardViewProps) {
  const [hoveredCell, setHoveredCell] = useState<{ suiteName: string, index: number, value: string } | null>(null);
  const [dbTick, setDbTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setDbTick(tick => tick + 1);
    };
    window.addEventListener('aware_db_update', handleUpdate);
    return () => window.removeEventListener('aware_db_update', handleUpdate);
  }, []);

  // Load from local browser database
  const runs = BrowserDb.getRuns();
  const testCases = BrowserDb.getTestCases();
  const suites = BrowserDb.getSuites();
  const anomalies = BrowserDb.getAnomalies();

  // Simulated heatmap data for stability
  const stabilitySuites = [
    { name: 'Prod Smoke', data: ['pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass'] },
    { name: 'Security Scan', data: ['pass', 'pass', 'pass', 'warn', 'pass', 'pass', 'fail', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass'] },
    { name: 'UAT Regression', data: ['pass', 'warn', 'warn', 'pass', 'pass', 'fail', 'fail', 'pass', 'pass', 'warn', 'pass', 'pass', 'pass', 'pass'] },
    { name: 'API E2E', data: ['pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass'] },
    { name: 'Mobile UI', data: ['warn', 'fail', 'warn', 'pass', 'warn', 'warn', 'pass', 'pass', 'warn', 'fail', 'warn', 'pass', 'pass', 'warn'] },
  ];

  // Dynamic metrics based on Browser DB state
  const getMetrics = () => {
    // Filter by environment
    const envRuns = runs.filter(r => activeEnv === 'All' || r.environment.toUpperCase() === activeEnv.toUpperCase());
    const envAnomalies = anomalies.filter(a => {
      if (activeEnv === 'All') return true;
      if (activeEnv === 'QA') return a.id.includes('ImageUpload');
      if (activeEnv === 'UAT') return false;
      if (activeEnv === 'PROD') return a.id.includes('AuthService') || a.id.includes('CheckoutFlow');
      return true;
    });

    const totalRunsCount = envRuns.length;
    let avgPassRate = 0;
    let avgDurationSec = 0;
    
    if (totalRunsCount > 0) {
      const sumPass = envRuns.reduce((acc, r) => acc + r.passRate, 0);
      avgPassRate = sumPass / totalRunsCount;
      
      let totalSec = 0;
      envRuns.forEach(r => {
        const cleanStr = r.duration.toLowerCase();
        let sec = 0;
        const minMatch = cleanStr.match(/(\d+)m/);
        const secMatch = cleanStr.match(/(\d+)s/);
        if (minMatch) sec += parseInt(minMatch[1]) * 60;
        if (secMatch) sec += parseInt(secMatch[1]);
        if (!minMatch && !secMatch) sec += parseFloat(cleanStr) || 0;
        totalSec += sec;
      });
      avgDurationSec = totalSec / totalRunsCount;
    } else {
      // Fallback
      avgPassRate = 92.4;
      avgDurationSec = 112;
    }

    const formatSec = (totalSeconds: number) => {
      if (totalSeconds === 0) return '0s';
      const mins = Math.floor(totalSeconds / 60);
      const secs = Math.round(totalSeconds % 60);
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    return {
      passRate: `${avgPassRate.toFixed(1)}%`,
      passRateTrend: avgPassRate >= 92 ? '↑ 1.2%' : '↓ 0.4%',
      passRateColor: avgPassRate >= 90 ? 'text-[#81c784]' : 'text-red-400',
      duration: formatSec(avgDurationSec),
      durationTrend: '--',
      totalRuns: totalRunsCount.toLocaleString(),
      totalRunsTrend: `↑ ${totalRunsCount}`,
      anomaliesCount: `${envAnomalies.length} Anomalies`,
      envAnomaliesList: envAnomalies
    };
  };

  const metrics = getMetrics();

  // Filter stabilitySuites based on environment
  const filteredStabilitySuites = stabilitySuites.filter((suite) => {
    if (activeEnv === 'All') return true;
    if (activeEnv === 'QA') return suite.name === 'Mobile UI' || suite.name === 'API E2E';
    if (activeEnv === 'UAT') return suite.name === 'Security Scan' || suite.name === 'UAT Regression';
    if (activeEnv === 'PROD') return suite.name === 'Prod Smoke' || suite.name === 'API E2E';
    return true;
  });

  const getCellColor = (state: string) => {
    switch (state) {
      case 'pass': return 'bg-[#2e7d32] border-[#4caf50]/20 hover:bg-[#388e3c]';
      case 'fail': return 'bg-[#c62828] border-[#ef5350]/20 hover:bg-[#d32f2f]';
      case 'warn': return 'bg-[#ef6c00] border-[#ff9800]/20 hover:bg-[#f57c00]';
      default: return 'bg-[#333333] border-zinc-700';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0c0c0c] select-none font-sans">
      {/* Title block */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Dashboard <span className="text-sm font-semibold text-zinc-500 font-mono ml-2">[{activeEnv === 'All' ? 'All Environments' : activeEnv}]</span>
          </h2>
          <p className="text-zinc-500 text-xs mt-1">Overall system status and pipeline automation performance matrix.</p>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* Pass Rate */}
        <div className="bg-[#131313] border border-[#262626] rounded p-4 flex flex-col justify-between h-24 relative overflow-hidden group hover:border-[#2e7d32]/50 transition-colors duration-150">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-400">Pass Rate</span>
            <CheckCircle size={16} className="text-[#81c784]" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className={`text-2xl font-bold tracking-tight font-mono ${metrics.passRateColor}`}>{metrics.passRate}</div>
            <span className={`text-[9px] font-mono font-bold ${metrics.passRateColor}`}>{metrics.passRateTrend}</span>
          </div>
        </div>

        {/* Avg Duration */}
        <div className="bg-[#131313] border border-[#262626] rounded p-4 flex flex-col justify-between h-24 relative overflow-hidden group hover:border-[#4daeff]/50 transition-colors duration-150">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-400">Avg Duration</span>
            <Clock size={16} className="text-[#4daeff]" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-white tracking-tight font-mono">{metrics.duration}</div>
            <span className="text-[9px] text-zinc-500 font-mono font-bold">{metrics.durationTrend}</span>
          </div>
        </div>

        {/* Total Runs */}
        <div className="bg-[#131313] border border-[#262626] rounded p-4 flex flex-col justify-between h-24 relative overflow-hidden group hover:border-zinc-700 transition-colors duration-150">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-400">Total Runs</span>
            <Layers size={16} className="text-zinc-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-white tracking-tight font-mono">{metrics.totalRuns}</div>
            <span className="text-[9px] text-[#81c784] font-mono font-bold">{metrics.totalRunsTrend}</span>
          </div>
        </div>

        {/* Flakiness Alert */}
        <div className="bg-[#131313] border border-[#c62828]/50 rounded p-4 flex flex-col justify-between h-24 relative overflow-hidden group hover:bg-[#c62828]/5 transition-colors duration-150 cursor-pointer" onClick={() => onNavigateToTab('Tests')}>
          <div className="absolute inset-0 bg-[#c62828] opacity-[0.02] pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-red-400">Flakiness Alert</span>
            <AlertTriangle size={16} className="text-red-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-red-400 tracking-tight relative z-10 font-mono">{metrics.anomaliesCount}</div>
        </div>
      </div>

      {/* Comparison Studio Promotion Banner */}
      <div id="comparison-promo-banner" className="bg-[#121212] border border-[#262626] rounded p-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden group hover:border-[#4daeff]/30 transition-all duration-200">
        <div className="absolute top-0 left-0 h-full w-1 bg-[#4daeff]/40"></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4daeff]/10 border border-[#4daeff]/20 flex items-center justify-center text-[#4daeff] group-hover:scale-105 transition-transform">
            <GitCompare size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
              Telemetry Comparison Studio <span className="px-1.5 py-0.5 rounded bg-[#4daeff]/10 text-[#4daeff] text-[8px] font-mono font-bold uppercase tracking-wider">New</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Diff test runs side-by-side to pinpoint code regressions, performance degradation, and log assertion mismatches.
            </p>
          </div>
        </div>
        <button 
          id="btn-open-comparison-studio"
          onClick={() => onNavigateToTab('Comparison')}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 border border-zinc-700 hover:border-zinc-600 transition-all shrink-0 cursor-pointer"
        >
          Open Comparison Studio <ArrowRight size={13} />
        </button>
      </div>

      {/* Main Grid: Heatmap + Active Anomalies */}
      <div className="grid grid-cols-12 gap-4">
        {/* Heatmap Cell Grid */}
        <div className="col-span-8 bg-[#131313] border border-[#262626] rounded p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Suite Stability (Last 14 Days)</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Stability heatmap across core microservices and UI blocks.</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono uppercase font-bold">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 bg-[#2e7d32] rounded-sm"></div>
                Pass
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 bg-[#ef6c00] rounded-sm"></div>
                Flaky
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 bg-[#c62828] rounded-sm"></div>
                Fail
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredStabilitySuites.map((suite) => (
              <div key={suite.name} className="flex items-center gap-4">
                <span className="font-mono text-xs text-zinc-400 w-36 truncate font-semibold">{suite.name}</span>
                <div className="flex gap-1 flex-1">
                  {suite.data.map((state, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredCell({ suiteName: suite.name, index: idx, value: state })}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-5 flex-1 rounded-sm border cursor-crosshair transition-all duration-150 relative ${getCellColor(state)}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Tooltip / Status indicator */}
          <div className="mt-6 pt-4 border-t border-[#262626]/50 h-8 flex items-center justify-between">
            {hoveredCell ? (
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 animate-fade-in">
                <span className="text-[#4daeff] font-bold">{hoveredCell.suiteName}</span>
                <span className="text-zinc-600">|</span>
                <span>Day {hoveredCell.index + 1}:</span>
                <span className={`capitalize font-bold ${
                  hoveredCell.value === 'pass' ? 'text-[#81c784]' : hoveredCell.value === 'fail' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {hoveredCell.value === 'pass' ? 'Passed' : hoveredCell.value === 'fail' ? 'Failed' : 'Flaky (Retried)'}
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-[10px] text-zinc-500">Commit: f9a2b{hoveredCell.index}</span>
              </div>
            ) : (
              <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#81c784]"></span>
                All metrics are synced with production CI telemetry pipelines.
              </div>
            )}
            <span className="text-[10px] text-zinc-500 font-mono">Updated: 2 mins ago</span>
          </div>
        </div>

        {/* Active Anomalies Feed List */}
        <div className="col-span-4 bg-[#131313] border border-[#262626] rounded p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-red-400" /> Active Anomalies
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono uppercase">Critical Feed</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {metrics.envAnomaliesList.length > 0 ? (
              metrics.envAnomaliesList.map((item) => (
                <div 
                  key={item.id}
                  className="p-3 border border-[#262626] rounded bg-[#0d0d0d] hover:bg-[#1a1a1a] transition-all duration-150 group border-l-2 hover:border-l-[#4daeff] flex flex-col gap-1.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span 
                      onClick={() => {
                        // Route user to the appropriate failed or flaky test
                        if (item.id.includes('AuthService')) {
                          onSelectTest('verify_user_authentication');
                        } else if (item.id.includes('CheckoutFlow')) {
                          onSelectTest('submit_checkout_form');
                        } else {
                          onSelectTest('user_controller_profile');
                        }
                      }}
                      className="font-mono text-xs text-zinc-200 truncate group-hover:text-[#4daeff] transition-colors leading-tight font-semibold cursor-pointer" 
                      title={item.id}
                    >
                      {item.id}
                    </span>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded leading-none shrink-0 ${item.badgeStyle}`}>
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal">{item.text}</p>
                  
                  {onTriggerAi && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerAi(`Review anomaly ${item.id} [${item.type}]: "${item.text}". Provide a comprehensive root cause analysis and a direct DevOps resolution plan.`);
                      }}
                      className="mt-1 py-1 bg-[#4daeff]/10 hover:bg-[#4daeff]/20 border border-[#4daeff]/30 hover:border-[#4daeff]/50 text-[#4daeff] text-[9px] font-mono font-bold rounded uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <Sparkles size={10} /> Diagnose with Chrome AI
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-[#0d0d0d] border border-[#262626]/40 rounded">
                <CheckCircle size={24} className="text-[#81c784] mb-2" />
                <span className="text-xs font-semibold text-zinc-200">System Fully Stable</span>
                <span className="text-[10px] text-zinc-500 font-mono mt-1">No anomalies detected in {activeEnv}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#262626]/50 flex justify-end">
            <button 
              onClick={() => onNavigateToTab('Tests')}
              className="text-xs font-semibold text-[#4daeff] hover:underline flex items-center gap-1"
            >
              Analyze All Anomalies <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
