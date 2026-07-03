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
import { BrowserDb } from './lib/browserDb';

export type EnvType = 'All' | 'QA' | 'UAT' | 'PROD';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('Last 30 Days');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [activeEnv, setActiveEnv] = useState<EnvType>('All');
  const [toasts, setToasts] = useState<{id: string, message: string, type: 'success' | 'info' | 'error'}[]>([]);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbTick, setDbTick] = useState(0);

  const [telemetryFilePath, setTelemetryFilePath] = useState('/public/telemetry.sqlite');
  const [pollRate, setPollRate] = useState(30000);
  const [isSyncEnabled, setIsSyncEnabled] = useState(true);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleUpdateConfig = (path: string, rate: number, enabled: boolean) => {
    setTelemetryFilePath(path);
    setPollRate(rate);
    setIsSyncEnabled(enabled);
    showToast('Telemetry settings saved', 'success');
  };

  const checkStaticSync = async (isManual = false) => {
    setIsSyncing(true);
    try {
      const result = await BrowserDb.fetchStaticTelemetry();
      setSyncResult(result);
      if (result.success) {
        setLastSyncTime(new Date());
        setDbTick(tick => tick + 1);
        if (isManual) {
          showToast(`Synced! Loaded ${result.runsCount} runs`, 'success');
        }
      } else {
        if (isManual) {
          showToast(`Sync details: ${result.message}`, 'info');
        }
      }
    } catch (err: any) {
      if (isManual) showToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    BrowserDb.init();
    if (isSyncEnabled) {
      checkStaticSync();
    }
    const handleUpdate = () => setDbTick(tick => tick + 1);
    window.addEventListener('aware_db_update', handleUpdate);
    return () => window.removeEventListener('aware_db_update', handleUpdate);
  }, [telemetryFilePath, pollRate, isSyncEnabled]);

  const handleNavigateToTab = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedTestId(null);
  };

  const handleSelectTest = (testId: string) => {
    setSelectedTestId(testId);
    setActiveTab('Tests');
  };

  return (
    <div className="h-screen w-screen flex bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none relative">
      <Sidebar activeTab={activeTab} setActiveTab={handleNavigateToTab} />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopBar 
          activeTab={activeTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          isBookmarked={isBookmarked}
          onToggleBookmark={() => setIsBookmarked(!isBookmarked)}
          activeEnv={activeEnv}
          setActiveEnv={setActiveEnv}
          syncResult={syncResult}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
          onForceSync={() => checkStaticSync(true)}
          onShowToast={showToast}
        />
        <main className="flex-1 overflow-hidden flex flex-col relative">
          {activeTab === 'Dashboard' && (
            <DashboardView 
              onNavigateToTab={handleNavigateToTab} 
              onSelectTest={handleSelectTest}
              activeEnv={activeEnv}
              onShowToast={showToast}
              simulationMode={simulationMode}
              onToggleSimulation={() => setSimulationMode(!simulationMode)}
            />
          )}
          {activeTab === 'Runs' && (
            <RunsView 
              searchQuery={searchQuery}
              onSelectTest={handleSelectTest}
              activeEnv={activeEnv}
              onShowToast={showToast}
              simulationMode={simulationMode}
              onToggleSimulation={() => setSimulationMode(!simulationMode)}
            />
          )}
          {activeTab === 'Tests' && (
            <TestsView 
              selectedTestId={selectedTestId}
              searchQuery={searchQuery}
              activeEnv={activeEnv}
              onShowToast={showToast}
              simulationMode={simulationMode}
              onToggleSimulation={() => setSimulationMode(!simulationMode)}
            />
          )}
          {activeTab === 'Suites' && (
            <SuitesView 
              onSelectTest={handleSelectTest}
              activeEnv={activeEnv}
              onShowToast={showToast}
              simulationMode={simulationMode}
              onToggleSimulation={() => setSimulationMode(!simulationMode)}
            />
          )}
          {activeTab === 'Analytics' && (
            <AnalyticsView 
              onSelectTest={handleSelectTest}
              activeEnv={activeEnv}
              onShowToast={showToast}
              simulationMode={simulationMode}
              onToggleSimulation={() => setSimulationMode(!simulationMode)}
            />
          )}
          {activeTab === 'Comparison' && (
            <ComparisonView 
              onSelectTest={handleSelectTest}
              onShowToast={showToast}
              simulationMode={simulationMode}
              onToggleSimulation={() => setSimulationMode(!simulationMode)}
            />
          )}
          {activeTab === 'Settings' && (
            <SettingsView 
              syncResult={syncResult}
              lastSyncTime={lastSyncTime}
              isSyncing={isSyncing}
              onForceSync={() => checkStaticSync(true)}
              telemetryFilePath={telemetryFilePath}
              pollRate={pollRate}
              isSyncEnabled={isSyncEnabled}
              onUpdateConfig={handleUpdateConfig}
              onShowToast={showToast}
              simulationMode={simulationMode}
              onToggleSimulation={() => setSimulationMode(!simulationMode)}
            />
          )}
        </main>
      </div>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full select-none pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded border shadow-lg flex items-start gap-2.5 font-sans animate-slide-up text-xs transition-all ${
              toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200' :
              toast.type === 'error' ? 'bg-rose-950/90 border-rose-800 text-rose-200' :
              'bg-zinc-900/95 border-zinc-800 text-zinc-200'
            }`}
          >
            <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
              toast.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
              'bg-zinc-800 text-zinc-400'
            }`}>
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ'}
            </div>
            <div className="flex-1 leading-normal font-medium">{toast.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
