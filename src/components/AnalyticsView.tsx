import React, { useState } from 'react';
import { BrowserDb } from '../lib/browserDb';
import TestCaseModal from './TestCaseModal';
import { TestCase, 
  TrendingUp, 
  Clock, 
  Layout, 
  AlertOctagon, 
  ChevronUp, 
  ChevronDown, 
  Activity, 
  Globe,
  Chrome,
  Terminal,
  HelpCircle
} from 'lucide-react';
import { 
  trendPoints, 
  environmentMatrix, 
  durationDistribution, 
  topFlakyTests 
} from '../data';

interface AnalyticsViewProps {
  onSelectTest: (testId: string) => void;
  activeEnv: 'All' | 'QA' | 'UAT' | 'PROD';
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function AnalyticsView({ onSelectTest, activeEnv, onShowToast }: AnalyticsViewProps) {
  const [modalTestCaseId, setModalTestCaseId] = useState<string | null>(null);
  const allTestCases = BrowserDb.getTestCases();

  const [hoveredTrend, setHoveredTrend] = useState<{ date: string; rate: number } | null>(null);
  const [selectedDurationBucket, setSelectedDurationBucket] = useState<string | null>('40-50s (Median)');

  // SVG dimensions for trend chart
  const width = 500;
  const height = 150;
  const padding = 25;

  // Calculate coordinates for the SVG trend line
  const maxRate = 100;
  const minRate = 80;
  const pointsCount = trendPoints.length;

  const points = trendPoints.map((pt, index) => {
    const x = padding + (index * (width - 2 * padding)) / (pointsCount - 1);
    // Inverse scale for SVG coordinate system (0 is at top)
    const y = height - padding - ((pt.rate - minRate) * (height - 2 * padding)) / (maxRate - minRate);
    return { x, y, data: pt };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // Area under path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950 select-none font-sans">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">System Analytics</h2>
        <p className="text-zinc-500 text-xs mt-1">Durable historical telemetry models tracking regression trends and infrastructure speed.</p>
      </div>

      {/* Analytics Main Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Pass Rate Trend Interactive SVG Chart */}
        <div className="col-span-12 lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <TrendingUp size={15} className="text-blue-400" /> Stability & Pass Rate Trend
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Average pipeline pass rate evaluated over the current calendar period.</p>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
              Avg: 95.1%
            </span>
          </div>

          {/* Interactive SVG Chart block */}
          <div className="relative my-4 flex justify-center bg-zinc-950/40 rounded border border-zinc-900/60 p-2">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 overflow-visible">
              {/* Grid Lines */}
              {[80, 85, 90, 95, 100].map((val, idx) => {
                const y = height - padding - ((val - minRate) * (height - 2 * padding)) / (maxRate - minRate);
                return (
                  <g key={val} className="opacity-20">
                    <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#52525b" strokeWidth="1" strokeDasharray="3,3" />
                    <text x={padding - 5} y={y + 4} fill="#a1a1aa" fontSize="8" fontFamily="monospace" textAnchor="end">{val}%</text>
                  </g>
                );
              })}

              {/* Area path */}
              <path d={areaD} fill="url(#gradient-cyan)" opacity="0.08" />

              {/* Line path */}
              <path d={pathD} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Coordinates points */}
              {points.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  className="fill-zinc-900 stroke-blue-400 stroke-2 cursor-pointer hover:r-6 transition-all"
                  onMouseEnter={() => setHoveredTrend(pt.data)}
                  onMouseLeave={() => setHoveredTrend(null)}
                />
              ))}

              {/* Gradient definitions */}
              <defs>
                <linearGradient id="gradient-cyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Float Tooltip detail coordinates */}
            {hoveredTrend && (
              <div className="absolute top-4 right-4 bg-zinc-800 border border-zinc-800 rounded px-3 py-1.5 font-mono text-[10px] text-zinc-300 animate-fade-in shadow-xl">
                <span className="text-blue-400 font-bold">{hoveredTrend.date}:</span>
                <span className="text-white font-extrabold ml-1.5">{hoveredTrend.rate}% Pass</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-3 border-t border-zinc-800/50">
            <span>Oct 01, 2026</span>
            <span>Hover coordinates to inspect precise metrics</span>
            <span>Oct 31, 2026</span>
          </div>
        </div>

        {/* Browser Testing Environment Matrix */}
        <div className="col-span-12 lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Globe size={15} className="text-zinc-400" /> Environment Matrix (Cross-Browser)
            </h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Reliability rates mapped across browser targets and execution staging areas.</p>
          </div>

          <div className="my-4 border border-zinc-800 bg-zinc-950/60 rounded overflow-hidden">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-zinc-900 text-zinc-500 text-[10px] uppercase font-bold border-b border-zinc-800">
                <tr>
                  <th className="p-2.5">Browser</th>
                  <th className={`p-2.5 text-center transition-colors duration-150 ${activeEnv === 'UAT' ? 'text-blue-400 bg-blue-500/10 font-extrabold border-x border-blue-500/20' : ''}`}>Stg (UAT)</th>
                  <th className={`p-2.5 text-center transition-colors duration-150 ${activeEnv === 'QA' ? 'text-orange-500 bg-orange-500/10 font-extrabold border-x border-orange-500/20' : ''}`}>QA</th>
                  <th className={`p-2.5 text-center transition-colors duration-150 ${activeEnv === 'PROD' ? 'text-emerald-400 bg-emerald-500/10 font-extrabold border-x border-emerald-500/20' : ''}`}>Prod</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {environmentMatrix.map((item) => (
                  <tr key={item.browser} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="p-2.5 font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Chrome size={12} className="text-zinc-500" /> {item.browser}
                    </td>
                    <td className={`p-2.5 text-center text-zinc-400 transition-colors duration-150 ${activeEnv === 'UAT' ? 'bg-blue-500/5 text-white font-semibold border-x border-blue-500/10' : ''}`}>{item.staging}%</td>
                    <td className={`p-2.5 text-center text-zinc-400 transition-colors duration-150 ${activeEnv === 'QA' ? 'bg-orange-500/5 text-white font-semibold border-x border-orange-500/10' : ''}`}>{item.qa}%</td>
                    <td className={`p-2.5 text-center font-bold transition-colors duration-150 ${
                      activeEnv === 'PROD' ? 'bg-emerald-500/5 border-x border-emerald-500/10' : ''
                    } ${
                      item.failed ? 'text-red-400 animate-pulse bg-red-500/5' : 'text-emerald-400'
                    }`}>
                      {item.prod}% {item.failed && '⚠️'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[10px] text-zinc-500 leading-normal flex items-start gap-1.5 pt-3 border-t border-zinc-800/50">
            <AlertOctagon size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <span>Warning: Safari builds fail to evaluate the Checkout Stripe frame cleanly due to a simulated cookie partition anomaly.</span>
          </div>
        </div>

        {/* Duration Distribution histogram columns */}
        <div className="col-span-12 lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Clock size={15} className="text-blue-400" /> Duration Distribution
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Bucket distribution of testing pipeline execution duration thresholds.</p>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Total: 10,240 runs</span>
          </div>

          {/* Columns graph list */}
          <div className="flex items-end gap-1.5 h-36 pt-4 px-2">
            {durationDistribution.map((bucket) => {
              const isSelected = selectedDurationBucket === bucket.range;
              return (
                <div 
                  key={bucket.range}
                  onClick={() => setSelectedDurationBucket(bucket.range)}
                  className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end"
                >
                  <div className="w-full flex justify-center text-[9px] font-mono text-zinc-500 group-hover:text-white transition-colors">
                    {bucket.runs}
                  </div>
                  <div 
                    className={`w-full rounded-t-sm transition-all duration-150 ${
                      bucket.failed 
                        ? 'bg-red-500/80 hover:bg-red-500' 
                        : isSelected 
                        ? 'bg-blue-500 shadow-lg shadow-blue-400/20' 
                        : 'bg-zinc-800 hover:bg-blue-500/50'
                    }`}
                    style={{ height: bucket.height }}
                  />
                  <div className={`text-[8px] font-mono tracking-tighter truncate w-full text-center ${
                    isSelected ? 'text-blue-400 font-bold' : 'text-zinc-500'
                  }`}>
                    {bucket.range.split(' ')[0]}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-between items-center text-[10px] font-mono text-zinc-500">
            <span>Bucket details: <strong className="text-zinc-300 font-bold">{selectedDurationBucket || 'Select a bucket'}</strong></span>
            <span>Median runtime steady at 45.2s</span>
          </div>
        </div>

        {/* Top Flaky Test Cases list */}
        <div className="col-span-12 lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <AlertOctagon size={15} className="text-amber-500 animate-pulse" /> Highly Flaky Testing Files
            </h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Automated calculation identifying the most unstable or flaky test targets.</p>
          </div>

          <div className="my-4 space-y-2 flex-1 overflow-y-auto max-h-40 pr-1">
            {topFlakyTests.map((test) => (
              <div 
                key={test.id}
                onClick={() => {
                  if (test.id.includes('AUTH')) {
                    setModalTestCaseId('verify_user_authentication');
                  } else {
                    setModalTestCaseId('submit_checkout_form');
                  }
                }}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 cursor-pointer rounded flex justify-between items-center group transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <span className="font-mono text-xs font-bold text-zinc-300 block truncate group-hover:text-blue-400 transition-colors">{test.path}</span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5">TestID: {test.id}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-white">{test.rate}</span>
                    <span className="text-[9px] text-zinc-500 font-mono block">Flake rate</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                    test.trendStatus === 'up' ? 'text-red-400' : test.trendStatus === 'down' ? 'text-emerald-400' : 'text-zinc-400'
                  }`}>
                    {test.trendStatus === 'up' ? <ChevronUp size={12} /> : test.trendStatus === 'down' ? <ChevronDown size={12} /> : '--'}
                    {test.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[10px] font-mono text-zinc-500 pt-3 border-t border-zinc-800/50 flex justify-between">
            <span>Metrics updated daily at 00:00 UTC</span>
            <span className="text-blue-400 cursor-pointer hover:underline" onClick={() => onShowToast?.("Optimization suggestions document download initialized...", "success")}>Optimization Guides</span>
          </div>
        </div>
      </div>
      {modalTestCaseId && (
        <TestCaseModal 
          testCases={allTestCases} 
          initialTestId={modalTestCaseId} 
          onClose={() => setModalTestCaseId(null)} 
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
}
