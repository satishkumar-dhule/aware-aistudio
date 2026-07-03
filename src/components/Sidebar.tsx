import React from 'react';
import { TabType } from '../types';
import { 
  LayoutDashboard, 
  PlayCircle, 
  CheckSquare, 
  Folder, 
  BarChart3, 
  Settings,
  GitCompare,
  Activity
} from 'lucide-react';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const navItems = [
    { id: 'Dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Runs' as TabType, label: 'Runs', icon: PlayCircle },
    { id: 'Tests' as TabType, label: 'Tests', icon: CheckSquare },
    { id: 'Suites' as TabType, label: 'Suites', icon: Folder },
    { id: 'Comparison' as TabType, label: 'Comparison', icon: GitCompare },
    { id: 'Analytics' as TabType, label: 'Analytics', icon: BarChart3 },
    { id: 'Settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-[180px] bg-zinc-950 border-r border-zinc-900 flex flex-col h-full py-4 select-none shrink-0">
      <div className="px-4 mb-8 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Activity size={18} className="stroke-[2.5]" />
        </div>
        <h1 className="font-sans text-sm font-bold text-zinc-100 leading-none tracking-tight">Test Runs</h1>
      </div>
      
      <nav className="flex-1 flex flex-col gap-1 px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md font-sans text-xs font-medium transition-colors w-full text-left ${
                isActive 
                  ? 'bg-zinc-800 text-zinc-100' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-blue-400' : 'text-zinc-500'} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
