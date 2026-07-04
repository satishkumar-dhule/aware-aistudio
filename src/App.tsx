import React, { useState, useEffect } from 'react';
import { TabType } from './types';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DashboardView from './components/DashboardView';
import RunsView from './components/RunsView';
import TestsView from './components/TestsView';
import SuitesView from './components/SuitesView';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import ComparisonView from './components/ComparisonView';
import AiAssistantPanel from './components/AiAssistantPanel';
import { BrowserDb } from './lib/browserDb';

export type EnvType = 'All' | 'QA' | 'UAT' | 'PROD';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('Last 30 Days');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);
  const [activeEnv, setActiveEnv] = useState<EnvType>('All');
  
  // AI assistant states
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | null>(null);

  // Sync results for static hosting on GitHub Pages
  const [syncResult, setSyncResult] = useState<{ success: boolean; source: string; message: string; runsCount?: number; testsCount?: number } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Configurable integration parameters
  const [telemetryFilePath, setTelemetryFilePath] = useState(() => localStorage.getItem('aware_telemetry_file_path') || './telemetry.sqlite');
  const [pollRate, setPollRate] = useState(() => Number(localStorage.getItem('aware_telemetry_poll_interval')) || 15000);
  const [isSyncEnabled, setIsSyncEnabled] = useState(() => localStorage.getItem('aware_telemetry_enabled') !== 'false');

  // Reactive DB key state to trigger top-level re-render on database changes
  const [dbTick, setDbTick] = useState(0);

  // Toast notification state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleUpdateConfig = (path: string, rate: number, enabled: boolean) => {
    localStorage.setItem('aware_telemetry_file_path', path);
    localStorage.setItem('aware_telemetry_poll_interval', String(rate));
    localStorage.setItem('aware_telemetry_enabled', String(enabled));
    setTelemetryFilePath(path);
    setPollRate(rate);
    setIsSyncEnabled(enabled);
    showToast('Telemetry integration parameters saved successfully!', 'success');
  };

  const checkStaticSync = async (isManual = false) => {
    setIsSyncing(true);
    try {
      const result = await BrowserDb.fetchStaticTelemetry();
      
      const isNewSuccess = result.success && (!syncResult || !syncResult.success);
      const isCountChanged = result.success && syncResult?.success && 
        (result.runsCount !== syncResult.runsCount || result.testsCount !== syncResult.testsCount);
      
      setSyncResult(result);
      
      if (result.success) {
        setSimulationMode(false); // Disable simulation mode to showcase real synced telemetry data
        setLastSyncTime(new Date());
        setDbTick(tick => tick + 1);
        
        if (isManual) {
          showToast(`Synced successfully! Loaded ${result.runsCount} runs and ${result.testsCount} test cases.`, 'success');
        } else if (isNewSuccess || isCountChanged) {
          showToast(`Dynamic Sync: Loaded fresh test telemetry! (${result.runsCount} active)`, 'success');
        }
      } else {
        if (isManual) {
          showToast(`Sync details: ${result.message}`, 'info');
        }
      }
    } catch (err: any) {
      console.error("Static telemetry fetch error", err);
      if (isManual) {
        showToast(`Sync failed: ${err.message || 'unknown error'}`, 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    BrowserDb.init();

    // Initial check
    if (isSyncEnabled) {
      checkStaticSync();
    }

    let pollInterval: any = null;
    if (isSyncEnabled && pollRate > 0) {
      // Set up AJAX periodic polling dynamically to refresh data
      pollInterval = setInterval(() => {
        console.log(`AWARE periodic dynamic background poll executing (${telemetryFilePath})...`);
        checkStaticSync();
      }, pollRate);
    }

    const handleUpdate = () => {
      setDbTick(tick => tick + 1);
    };
    window.addEventListener('aware_db_update', handleUpdate);
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      window.removeEventListener('aware_db_update', handleUpdate);
    };
  }, [telemetryFilePath, pollRate, isSyncEnabled, syncResult?.runsCount, syncResult?.testsCount]);

  const handleForceSync = () => {
    checkStaticSync(true);
  };

  const handleToggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleNavigateToTab = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedTestId(null);
  };

  const handleSelectTest = (testId: string) => {
    setSelectedTestId(testId);
    setActiveTab('Tests');
  };

  const handleRefreshData = async () => {
    setIsSyncing(true);
    await BrowserDb.fetchLatestTestResults();
    setIsSyncing(false);
  };

  const handleTriggerAi = (prompt: string) => {
    setAiInitialPrompt(prompt);
    setIsAiOpen(true);
  };

  // Background simulation interval representing active telemetry pipeline streams
  useEffect(() => {
    if (!simulationMode) return;

    const interval = setInterval(() => {
      console.log("Background telemetry heartbeat executing automated pipeline run...");
      // removed simulation
    }, 45000); // Append a simulated pipeline run every 45 seconds to demonstrate live ingestion

    return () => clearInterval(interval);
  }, [simulationMode]);

  return (
    <div className="h-screen w-screen flex bg-[#0c0c0c] text-zinc-100 overflow-hidden font-sans select-none relative">
      {/* Sidebar Navigation Left Panel */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleNavigateToTab} 
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header Search and Controls */}
        <TopBar 
          activeTab={activeTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          onRefreshData={handleRefreshData}
          isBookmarked={isBookmarked}
          onToggleBookmark={handleToggleBookmark}
          activeEnv={activeEnv}
          setActiveEnv={setActiveEnv}
          onToggleAi={() => setIsAiOpen(!isAiOpen)}
          syncResult={syncResult}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
          onForceSync={handleForceSync}
          onShowToast={showToast}
        />

        {/* Workspace views routing */}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          {activeTab === 'Dashboard' && (
            <DashboardView 
              onNavigateToTab={handleNavigateToTab} 
              onSelectTest={handleSelectTest}
              activeEnv={activeEnv}
              onTriggerAi={handleTriggerAi}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'Runs' && (
            <RunsView 
              searchQuery={searchQuery}
              onRefreshData={handleRefreshData}
              onSelectTest={handleSelectTest}
              activeEnv={activeEnv}
              onTriggerAi={handleTriggerAi}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'Tests' && (
            <TestsView 
              selectedTestId={selectedTestId}
              searchQuery={searchQuery}
              activeEnv={activeEnv}
              onTriggerAi={handleTriggerAi}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'Suites' && (
            <SuitesView 
              onSelectTest={handleSelectTest}
              activeEnv={activeEnv}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'Analytics' && (
            <AnalyticsView 
              onSelectTest={handleSelectTest}
              activeEnv={activeEnv}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'Comparison' && (
            <ComparisonView 
              onSelectTest={handleSelectTest}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'Settings' && (
            <SettingsView 
              onRefreshData={handleRefreshData}
              simulationMode={simulationMode}
              onToggleSimulation={() => setSimulationMode(!simulationMode)}
              syncResult={syncResult}
              lastSyncTime={lastSyncTime}
              isSyncing={isSyncing}
              onForceSync={handleForceSync}
              telemetryFilePath={telemetryFilePath}
              pollRate={pollRate}
              isSyncEnabled={isSyncEnabled}
              onUpdateConfig={handleUpdateConfig}
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Collapsible Google Chrome AI Telemetry Analyst sidebar */}
      <AiAssistantPanel 
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        initialPrompt={aiInitialPrompt}
        onClearInitialPrompt={() => setAiInitialPrompt(null)}
      />

      {/* Dynamic Toast Notifications container (Floating bottom right) */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full select-none pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded border shadow-lg flex items-start gap-2.5 font-sans animate-slide-up text-xs transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
                : toast.type === 'error'
                  ? 'bg-rose-950/90 border-rose-800 text-rose-200'
                  : 'bg-zinc-900/95 border-zinc-800 text-zinc-200'
            }`}
          >
            <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400'
                : toast.type === 'error'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-zinc-800 text-zinc-400'
            }`}>
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ'}
            </div>
            <div className="flex-1 leading-normal font-medium">
              {toast.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
