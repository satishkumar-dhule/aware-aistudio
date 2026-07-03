import React, { useState } from 'react';
import { TabType } from '../types';
import { 
  Search, 
  Clock, 
  Filter, 
  Bell, 
  Bookmark, 
  Share2, 
  Check,
  Calendar,
  Sparkles,
  Command
} from 'lucide-react';

interface TopBarProps {
  activeTab: TabType;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  timeRange: string;
  setTimeRange: (range: string) => void;
  onRefreshData?: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  activeEnv: 'All' | 'QA' | 'UAT' | 'PROD';
  setActiveEnv: (env: 'All' | 'QA' | 'UAT' | 'PROD') => void;
  onToggleAi?: () => void;
  syncResult?: { success: boolean; source: string; message: string; runsCount?: number; testsCount?: number } | null;
  lastSyncTime?: Date | null;
  isSyncing?: boolean;
  onForceSync?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function TopBar({ 
  activeTab, 
  searchQuery, 
  setSearchQuery, 
  timeRange, 
  setTimeRange,
  onRefreshData,
  isBookmarked,
  onToggleBookmark,
  activeEnv,
  setActiveEnv,
  onToggleAi,
  syncResult,
  lastSyncTime,
  isSyncing,
  onForceSync,
  onShowToast
}: TopBarProps) {
  const [showBellMenu, setShowBellMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'Runs': return 'Search Run ID or branch...';
      case 'Tests': return 'Search tests by name, ID, or path...';
      case 'Suites': return 'Search suites, tags, IDs...';
      default: return 'Search metrics or logs...';
    }
  };

  const notifications = [
    { id: 1, title: 'Memory Threshold Exceeded', msg: "Container 'api-gateway' exceeded 95% threshold.", time: 'Just now', type: 'error' },
    { id: 2, title: 'Flakiness Alert Detected', msg: 'AuthService.testTokenRefresh failed 3 of last 5 runs.', time: '15 mins ago', type: 'warn' },
    { id: 3, title: 'Pipeline Run Completed', msg: 'Security_Core_Auth_Suite passed in UAT.', time: '2 hrs ago', type: 'success' }
  ];

  return (
    <header className="h-[36px] bg-[#111111] border-b border-[#222222] flex justify-between items-center px-4 sticky top-0 z-40 select-none shrink-0 font-sans">
      {/* Search Bar / Left context */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#4daeff] transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getSearchPlaceholder()}
            className="w-full bg-[#161616] border border-[#222222] rounded pl-8 pr-12 py-1 text-[11px] text-zinc-200 outline-none focus:border-[#4daeff] focus:ring-1 focus:ring-[#4daeff]/20 transition-all placeholder:text-zinc-500 font-mono"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <kbd className="px-1 py-0.5 bg-[#222222] rounded text-[8px] text-zinc-400 font-mono border border-zinc-700">⌘</kbd>
            <kbd className="px-1 py-0.5 bg-[#222222] rounded text-[8px] text-zinc-400 font-mono border border-zinc-700">K</kbd>
          </div>
        </div>

        {/* Top Navigation Links */}
        <nav className="hidden lg:flex items-center gap-3.5 h-[44px]">
          <span className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider">Nav:</span>
          <a href="#alerts" className="font-mono text-[9px] uppercase font-bold tracking-wider text-[#4daeff] border-b border-[#4daeff] h-full flex items-center px-0.5">Alerts</a>
        </nav>
      </div>

      {/* Action Area */}
      <div className="flex items-center gap-2">
        {syncResult?.success && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-emerald-950/20 border border-emerald-900/40 rounded text-[9px] font-mono text-emerald-400">
            <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isSyncing ? 'animate-ping' : 'animate-pulse'}`}></span>
            <span className="font-bold">PAGES SYNC</span>
            {lastSyncTime && (
              <span className="text-zinc-500 text-[8px] font-medium">
                ({lastSyncTime.toLocaleTimeString()})
              </span>
            )}
            <button
              onClick={onForceSync}
              disabled={isSyncing}
              title="Force dynamic AJAX synchronization now"
              className={`ml-1 text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer px-1 hover:bg-emerald-900/30 rounded text-[10px] ${isSyncing ? 'animate-spin opacity-50' : ''}`}
            >
              ⟳
            </button>
          </div>
        )}
        {isSyncing && !syncResult?.success && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-850 rounded text-[9px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4daeff] animate-pulse"></span>
            <span className="font-medium">SYNCING...</span>
          </div>
        )}
        {!syncResult?.success && !isSyncing && onForceSync && (
          <button
            onClick={onForceSync}
            title="Scan for static telemetry_data.json via AJAX"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#252525] hover:border-zinc-700 border border-zinc-850 rounded text-[9px] font-mono text-zinc-400 transition-colors cursor-pointer"
          >
            <span className="text-[10px]">⟳</span>
            <span>SYNC</span>
          </button>
        )}

        {/* Environment Selector Dropdown */}
        <div className="flex items-center gap-1.5 bg-[#161616] border border-[#222222] hover:border-[#4daeff]/50 rounded px-2.5 py-1 transition-colors cursor-pointer relative group">
          <span className={`w-1.5 h-1.5 rounded-full ${
            activeEnv === 'All' ? 'bg-indigo-400' :
            activeEnv === 'QA' ? 'bg-[#ff9800]' :
            activeEnv === 'UAT' ? 'bg-[#4daeff]' :
            'bg-[#81c784]'
          }`}></span>
          <span className="text-[9px] font-mono uppercase font-bold text-zinc-400">Env:</span>
          <select 
            value={activeEnv} 
            onChange={(e) => setActiveEnv(e.target.value as any)}
            className="bg-transparent border-none text-[9px] font-mono uppercase font-bold text-zinc-200 cursor-pointer outline-none focus:ring-0 py-0 pl-0 pr-4 appearance-none select-none"
          >
            <option value="All">All Envs</option>
            <option value="QA">QA</option>
            <option value="UAT">UAT</option>
            <option value="PROD">PROD</option>
          </select>
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[9px] font-bold">▾</div>
        </div>

        {/* Time Selector Dropdown */}
        <div className="flex items-center gap-1.5 bg-[#161616] border border-[#222222] hover:border-[#4daeff]/50 rounded px-2.5 py-1 transition-colors cursor-pointer relative group">
          <Calendar size={11} className="text-zinc-500" />
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-transparent border-none text-[9px] font-mono uppercase font-bold text-zinc-200 cursor-pointer outline-none focus:ring-0 py-0 pl-0 pr-4 appearance-none select-none"
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 14 Days">Last 14 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 90 Days">Last 90 Days</option>
          </select>
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[9px] font-bold">▾</div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-0.5 border-l border-[#222222] pl-2">
          {/* Refresh/Simulate button */}
          <button 
            onClick={onRefreshData}
            title="Simulate / Trigger Test Pass Rates Update"
            className="w-7 h-7 rounded hover:bg-[#161616] text-zinc-400 hover:text-[#4daeff] flex items-center justify-center transition-colors relative"
          >
            <Clock size={14} />
          </button>

          {/* Filter helper indicator */}
          <button 
            onClick={() => onShowToast?.("Global filter configuration is synchronized dynamically with each tab's left sidebar filters.", "info")}
            title="Active Filter Mode"
            className="w-7 h-7 rounded hover:bg-[#161616] text-zinc-400 hover:text-[#4daeff] flex items-center justify-center transition-colors"
          >
            <Filter size={14} />
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button 
              onClick={() => setShowBellMenu(!showBellMenu)}
              className="w-7 h-7 rounded hover:bg-[#161616] text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors relative"
            >
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 border border-[#111111] animate-pulse"></span>
            </button>

            {showBellMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-[#161616] border border-[#222222] rounded shadow-xl z-50 py-1.5 divide-y divide-[#222222] font-sans">
                <div className="px-3 py-1 flex justify-between items-center">
                  <span className="text-[11px] font-bold text-zinc-200">Alert Center</span>
                  <span className="text-[9px] text-[#4daeff] uppercase font-mono font-bold cursor-pointer" onClick={() => setShowBellMenu(false)}>Close</span>
                </div>
                {notifications.map(n => (
                  <div key={n.id} className="p-2.5 hover:bg-[#1f1f1f] transition-colors">
                    <div className="flex justify-between items-start">
                      <span className={`text-[11px] font-semibold ${n.type === 'error' ? 'text-red-400' : n.type === 'warn' ? 'text-amber-400' : 'text-[#4daeff]'}`}>
                        {n.title}
                      </span>
                      <span className="text-[8px] text-zinc-500 font-mono">{n.time}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal">{n.msg}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Action Modals / Bookmarks */}
        <div className="w-px h-4 bg-[#222222]"></div>

        {onToggleAi && (
          <button 
            onClick={onToggleAi}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold bg-[#161616] text-[#4daeff] border border-[#4daeff]/35 hover:border-[#4daeff]/70 hover:bg-[#4daeff]/5 transition-colors"
          >
            <Sparkles size={11} className="text-[#4daeff]" />
            Chrome AI
          </button>
        )}

        <button 
          onClick={onToggleBookmark}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold transition-colors ${
            isBookmarked 
              ? 'bg-[#4daeff]/10 text-[#4daeff] border border-[#4daeff]/30' 
              : 'border border-[#222222] text-zinc-300 hover:bg-[#161616] hover:border-zinc-700'
          }`}
        >
          <Bookmark size={11} className={isBookmarked ? 'fill-current' : ''} />
          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>

        <button 
          onClick={handleShare}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-mono uppercase font-bold bg-[#4daeff] text-black hover:bg-[#66baff] transition-colors"
        >
          <Share2 size={11} />
          Share
        </button>
      </div>

      {/* Share Modal Dialog overlay */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 font-sans p-4 animate-fade-in">
          <div className="bg-[#131313] border border-[#262626] p-6 max-w-sm w-full rounded relative shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-[#4daeff]" /> Share Observability Workspace
            </h3>
            <p className="text-xs text-zinc-400 mb-4 leading-normal">
              Generate a shareable links of your AWARE dashboard with state filters preserved. Anyone with access can view active anomalies and logs.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="flex-1 bg-[#1a1a1a] border border-[#262626] rounded px-3 py-1.5 text-[10px] font-mono text-zinc-300 outline-none select-all"
              />
              <button 
                onClick={handleCopy}
                className="bg-[#262626] hover:bg-zinc-700 text-white px-3 rounded font-mono text-[10px] uppercase font-bold flex items-center justify-center gap-1.5 min-w-[80px]"
              >
                {copiedLink ? <Check size={12} className="text-green-400" /> : 'Copy'}
                {copiedLink ? 'Copied' : 'Link'}
              </button>
            </div>
            <button 
              onClick={() => setShowShareModal(false)}
              className="w-full bg-[#1a1a1a] border border-[#262626] hover:bg-zinc-800 text-zinc-400 text-xs py-2 rounded font-semibold transition-colors"
            >
              Close Dialog
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
