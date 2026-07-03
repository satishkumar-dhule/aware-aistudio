import React from 'react';
import { TabType } from '../types';
import { 
  LayoutDashboard, 
  PlayCircle, 
  CheckSquare, 
  Folder, 
  BarChart3, 
  Settings, 
  BookOpen, 
  HelpCircle,
  Eye,
  GitCompare
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
    <aside className="w-[160px] bg-[#111111] border-r border-[#222222] flex flex-col h-full py-3 select-none shrink-0">
      {/* Brand Header */}
      <div className="px-3 mb-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-[#4daeff]/10 border border-[#4daeff]/30 flex items-center justify-center text-[#4daeff]">
          <Eye size={16} className="stroke-[2.5]" />
        </div>
        <div>
          <h1 className="font-sans text-base font-bold text-[#4daeff] leading-none tracking-tight">AWARE</h1>
          <p className="font-mono text-[9px] text-zinc-500 uppercase mt-0.5 tracking-widest font-semibold">Observability</p>
        </div>
      </div>

      {/* Nav Menu Items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-xs font-medium transition-all text-left group ${
                isActive
                  ? 'bg-[#1a1a1a] text-[#4daeff] border-l-2 border-[#4daeff]'
                  : 'text-zinc-400 hover:bg-[#1a1a1a]/50 hover:text-white'
              }`}
            >
              <Icon 
                size={15} 
                className={`transition-transform duration-150 group-hover:scale-105 ${
                  isActive ? 'text-[#4daeff]' : 'text-zinc-500 group-hover:text-zinc-300'
                }`} 
              />
              <span className="font-sans">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
