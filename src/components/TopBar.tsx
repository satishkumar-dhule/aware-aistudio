import React, { useState } from 'react';
import { TabType } from '../types';
import { 
  Search, 
  Calendar, 
  Bookmark, 
  Share2, 
  Check,
  RefreshCw,
  Database
} from 'lucide-react';
import { EnvType } from '../App';

interface TopBarProps {
  activeTab: TabType;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  timeRange: string;
  setTimeRange: (range: string) => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  activeEnv: EnvType;
  setActiveEnv: (env: EnvType) => void;
  syncResult?: any;
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
  isBookmarked,
  onToggleBookmark,
  activeEnv,
  setActiveEnv,
  syncResult,
  lastSyncTime,
  isSyncing,
  onForceSync,
  onShowToast
}: TopBarProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    setShowShareModal(true);
    setCopiedLink(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <header className="h-[52px] bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-4 select-none shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wide hidden sm:block min-w-[120px]">
          {activeTab}
        </h2>
        
        <div className="relative w-full max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search test runs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-1.5 pl-9 pr-4 text-xs font-sans text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onForceSync && (
           <button 
             onClick={onForceSync}
             disabled={isSyncing}
             className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded px-2.5 py-1.5 transition-colors disabled:opacity-50"
           >
             <RefreshCw size={12} className={isSyncing ? "animate-spin text-zinc-500" : "text-zinc-500"} />
             <span className="text-[10px] font-medium text-zinc-300">
               {isSyncing ? 'Syncing...' : lastSyncTime ? 'Sync' : 'Sync Offline DB'}
             </span>
           </button>
        )}

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 relative">
          <span className="text-[10px] font-medium text-zinc-500 ml-1">Env:</span>
          <select 
            value={activeEnv} 
            onChange={(e) => setActiveEnv(e.target.value as EnvType)}
            className="bg-transparent border-none text-[10px] font-medium text-zinc-200 cursor-pointer outline-none appearance-none pr-4"
          >
            <option value="All">All Environments</option>
            <option value="QA">QA</option>
            <option value="UAT">UAT</option>
            <option value="PROD">PROD</option>
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[9px] font-bold">▾</div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 relative">
          <Calendar size={12} className="text-zinc-500 ml-1" />
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-transparent border-none text-[10px] font-medium text-zinc-200 cursor-pointer outline-none appearance-none pr-4"
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 14 Days">Last 14 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 90 Days">Last 90 Days</option>
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[9px] font-bold">▾</div>
        </div>

        <div className="w-px h-4 bg-zinc-800 mx-1"></div>

        <button 
          onClick={onToggleBookmark}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-medium transition-colors ${
            isBookmarked 
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
              : 'border border-zinc-800 text-zinc-400 hover:bg-zinc-900'
          }`}
        >
          <Bookmark size={12} className={isBookmarked ? 'fill-current' : ''} />
          <span className="hidden xl:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
        </button>

        <button 
          onClick={handleShare}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-medium bg-zinc-200 text-zinc-900 hover:bg-white transition-colors"
        >
          <Share2 size={12} />
          <span className="hidden xl:inline">Share</span>
        </button>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 p-6 max-w-sm w-full rounded-lg shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-100 mb-2">Share View</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Share this dashboard view with current filters preserved.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-[11px] font-mono text-zinc-300 outline-none"
              />
              <button 
                onClick={handleCopy}
                className="bg-zinc-200 hover:bg-white text-zinc-900 px-4 rounded text-[11px] font-medium flex items-center justify-center gap-1.5"
              >
                {copiedLink ? <Check size={14} className="text-emerald-600" /> : 'Copy'}
              </button>
            </div>
            <button 
              onClick={() => setShowShareModal(false)}
              className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs py-2 rounded-md font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
