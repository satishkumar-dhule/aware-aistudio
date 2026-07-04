import React, { useState } from 'react';
import { 
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
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0c0c0c] select-none font-sans">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">System Analytics</h2>
        <p className="text-zinc-500 text-xs mt-1">Durable historical telemetry models tracking regression trends and infrastructure speed.</p>
      </div>

      {/* Analytics Main Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Pass Rate Trend Interactive SVG Chart */}
        <div className="col-span-12 lg:col-span-7 bg-[#131313] border border-[#262626] rounded p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <TrendingUp size={15} className="text-[#4daeff]" /> Stability & Pass Rate Trend
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Average pipeline pass rate evaluated over the current calendar period.</p>
            </div>
            <span className="text-[10px] text-[#81c784] font-mono font-bold uppercase bg-[#81c784]/15 border border-[#81c784]/30 px-2 py-0.5 rounded">
              Avg: 95.1%
            </span>
          </div>

          {/* Interactive SVG Chart block */}
          <div className="relative my-4 flex justify-center bg-[#0d0d0d]/40 rounded border border-zinc-900/60 p-2">
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
              <path d={pathD} fill="none" stroke="#4daeff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Coordinates points */}
              {points.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  className="fill-[#131313] stroke-[#4daeff] stroke-2 cursor-pointer hover:r-6 transition-all"
                  onMouseEnter={() => setHoveredTrend(pt.data)}
                  onMouseLeave={() => setHoveredTrend(null)}
                />
              ))}

              {/* Gradient definitions */}
              <defs>
                <linearGradient id="gradient-cyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4daeff" />
                  <stop offset="100%" stopColor="#4daeff" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Float Tooltip detail coordinates */}
            {hoveredTrend && (
              <div className="absolute top-4 right-4 bg-[#1a1a1a] border border-[#262626] rounded px-3 py-1.5 font-mono text-[10px] text-zinc-300 animate-fade-in shadow-xl">
                <span className="text-[#4daeff] font-bold">{hoveredTrend.date}:</span>
                <span className="text-white font-extrabold ml-1.5">{hoveredTrend.rate}% Pass</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-3 border-t border-[#262626]/50">
            <span>Oct 01, 2026</span>
            <span>Hover coordinates to inspect precise metrics</span>
            <span>Oct 31, 2026</span>
          </div>
        </div>

        {/* Browser Testing Environment Matrix */}
        <div className="col-span-12 lg:col-span-5 bg-[#131313] border border-[#262626] rounded p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Globe size={15} className="text-zinc-400" /> Environment Matrix (Cross-Browser)
            </h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Reliability rates mapped across browser targets and execution staging areas.</p>
          </div>

          <div className="my-4 border border-[#262626] bg-[#0d0d0d]/60 rounded overflow-hidden">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#141414] text-zinc-500 text-[10px] uppercase font-bold border-b border-[#262626]">
                <tr>
                  <th className="p-2.5">Browser</th>
                  <th className={`p-2.5 text-center transition-colors duration-150 ${activeEnv === 'UAT' ? 'text-[#4daeff] bg-[#4daeff]/10 font-extrabold border-x border-[#4daeff]/20' : ''}`}>Stg (UAT)</th>
                  <th className={`p-2.5 text-center transition-colors duration-150 ${activeEnv === 'QA' ? 'text-[#ff9800] bg-[#ff9800]/10 font-extrabold border-x border-[#ff9800]/20' : ''}`}>QA</th>
                  <th className={`p-2.5 text-center transition-colors duration-150 ${activeEnv === 'PROD' ? 'text-[#81c784] bg-[#81c784]/10 font-extrabold border-x border-[#81c784]/20' : ''}`}>Prod</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]/60">
                {environmentMatrix.map((item) => (
                  <tr key={item.browser} className="hover:bg-[#1a1a1a]/50 transition-colors">
                    <td className="p-2.5 font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Chrome size={12} className="text-zinc-500" /> {item.browser}
                    </td>
                    <td className={`p-2.5 text-center text-zinc-400 transition-colors duration-150 ${activeEnv === 'UAT' ? 'bg-[#4daeff]/5 text-white font-semibold border-x border-[#4daeff]/10' : ''}`}>{item.staging}%</td>
                    <td className={`p-2.5 text-center text-zinc-400 transition-colors duration-150 ${activeEnv === 'QA' ? 'bg-[#ff9800]/5 text-white font-semibold border-x border-[#ff9800]/10' : ''}`}>{item.qa}%</td>
                    <td className={`p-2.5 text-center font-bold transition-colors duration-150 ${
                      activeEnv === 'PROD' ? 'bg-[#81c784]/5 border-x border-[#81c784]/10' : ''
                    } ${
                      item.failed ? 'text-red-400 animate-pulse bg-red-500/5' : 'text-[#81c784]'
                    }`}>
                      {item.prod}% {item.failed && '⚠️'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[10px] text-zinc-500 leading-normal flex items-start gap-1.5 pt-3 border-t border-[#262626]/50">
            <AlertOctagon size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <span>Warning: Safari builds fail to evaluate the Checkout Stripe frame cleanly due to a simulated cookie partition anomaly.</span>
          </div>
        </div>

        {/* Duration Distribution histogram columns */}
        <div className="col-span-12 lg:col-span-6 bg-[#131313] border border-[#262626] rounded p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Clock size={15} className="text-[#4daeff]" /> Duration Distribution
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
                        ? 'bg-[#4daeff] shadow-lg shadow-[#4daeff]/20' 
                        : 'bg-zinc-800 hover:bg-[#4daeff]/50'
                    }`}
                    style={{ height: bucket.height }}
                  />
                  <div className={`text-[8px] font-mono tracking-tighter truncate w-full text-center ${
                    isSelected ? 'text-[#4daeff] font-bold' : 'text-zinc-500'
                  }`}>
                    {bucket.range.split(' ')[0]}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-[#262626]/50 flex justify-between items-center text-[10px] font-mono text-zinc-500">
            <span>Bucket details: <strong className="text-zinc-300 font-bold">{selectedDurationBucket || 'Select a bucket'}</strong></span>
            <span>Median runtime steady at 45.2s</span>
          </div>
        </div>

        {/* Top Flaky Test Cases list */}
        <div className="col-span-12 lg:col-span-6 bg-[#131313] border border-[#262626] rounded p-4 flex flex-col justify-between">
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
                    onSelectTest('verify_user_authentication');
                  } else {
                    onSelectTest('submit_checkout_form');
                  }
                }}
                className="p-2.5 bg-[#0d0d0d] border border-[#262626] hover:bg-[#1a1a1a] cursor-pointer rounded flex justify-between items-center group transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <span className="font-mono text-xs font-bold text-zinc-300 block truncate group-hover:text-[#4daeff] transition-colors">{test.path}</span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5">TestID: {test.id}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-white">{test.rate}</span>
                    <span className="text-[9px] text-zinc-500 font-mono block">Flake rate</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                    test.trendStatus === 'up' ? 'text-red-400' : test.trendStatus === 'down' ? 'text-[#81c784]' : 'text-zinc-400'
                  }`}>
                    {test.trendStatus === 'up' ? <ChevronUp size={12} /> : test.trendStatus === 'down' ? <ChevronDown size={12} /> : '--'}
                    {test.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[10px] font-mono text-zinc-500 pt-3 border-t border-[#262626]/50 flex justify-between">
            <span>Metrics updated daily at 00:00 UTC</span>
            <span className="text-[#4daeff] cursor-pointer hover:underline" onClick={() => onShowToast?.("Optimization suggestions document download initialized...", "success")}>Optimization Guides</span>
          </div>
        </div>
      </div>
    </div>
  );
}
