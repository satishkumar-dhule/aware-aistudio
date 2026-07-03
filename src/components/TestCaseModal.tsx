import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Copy, Clock, FolderOpen, GitCommit } from 'lucide-react';
import { TestCase } from '../types';

interface TestCaseModalProps {
  testCases: TestCase[];
  initialTestId: string;
  onClose: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function TestCaseModal({ testCases, initialTestId, onClose, onShowToast }: TestCaseModalProps) {
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);
  const [activeTab, setActiveTab] = useState<'Error' | 'History' | 'Metrics'>('Error');

  useEffect(() => {
    const match = testCases.find(t => t.id === initialTestId);
    if (match) setSelectedTest(match);
  }, [initialTestId, testCases]);

useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (!selectedTest) return;
      
      const currentIndex = testCases.findIndex(t => t.id === selectedTest.id);
      const hasNext = currentIndex < testCases.length - 1;
      const hasPrev = currentIndex > 0;
      
      if (e.key === 'ArrowRight' && hasNext) {
        setSelectedTest(testCases[currentIndex + 1]);
      }
      if (e.key === 'ArrowLeft' && hasPrev) {
        setSelectedTest(testCases[currentIndex - 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTest, testCases, onClose]);

  if (!selectedTest) return null;

  const currentIndex = testCases.findIndex(t => t.id === selectedTest.id);
  const hasNext = currentIndex < testCases.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNext = () => {
    if (hasNext) setSelectedTest(testCases[currentIndex + 1]);
  };

  const handlePrev = () => {
    if (hasPrev) setSelectedTest(testCases[currentIndex - 1]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl w-full h-full max-w-6xl flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Rail */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-[#101010]">
          <div className="flex items-center gap-4">
            <span className={`px-2 py-0.5 rounded-sm font-mono text-[10px] uppercase font-bold border ${
              selectedTest.status === 'Failed' 
                ? 'bg-red-500/15 text-red-400 border-red-500/30' 
                : selectedTest.status === 'Flaky'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-green-500/15 text-green-500 border-green-500/30'
            }`}>
              {selectedTest.status}
            </span>
            <h2 className="text-sm font-bold text-white truncate max-w-lg">{selectedTest.name}</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 border border-zinc-800 rounded bg-zinc-900 p-0.5">
              <button 
                onClick={handlePrev}
                disabled={!hasPrev}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous Test Case"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-[10px] font-mono text-zinc-500 px-2 font-bold select-none">
                {currentIndex + 1} / {testCases.length}
              </div>
              <button 
                onClick={handleNext}
                disabled={!hasNext}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next Test Case"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            
            <button 
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Close Full Screen"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800">
             <div className="flex items-center gap-6 text-xs font-mono text-zinc-500 flex-wrap">
                <span className="flex items-center gap-1.5 leading-none" title="Source Folder"><FolderOpen size={14} /> {selectedTest.folder}</span>
                <span className="flex items-center gap-1.5 leading-none" title="Execution Duration"><Clock size={14} /> {selectedTest.duration}</span>
                <span className="flex items-center gap-1.5 leading-none" title="Pipeline Run ID">
                  <span className="text-[10px] uppercase font-bold text-zinc-600">RUN:</span>
                  <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">{selectedTest.runId}</span>
                </span>
              </div>
          </div>

          <div className="flex border-b border-zinc-800 bg-[#101010]">
            {(['Error', 'History', 'Metrics'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-mono text-[10px] uppercase font-bold tracking-wider relative transition-colors ${
                  activeTab === tab ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'Error' ? 'Execution Context & Errors' : tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'Error' && (
              <>
                {selectedTest.errorMsg ? (
                  <>
                    <div className="border border-red-500/30 bg-red-500/5 p-4 rounded flex flex-col gap-4 relative group">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(selectedTest.errorMsg || '');
                          if (onShowToast) onShowToast("Log copied to clipboard!", "success");
                        }}
                        className="absolute right-3 top-3 p-1.5 bg-red-500/10 text-red-400 hover:text-white rounded transition-colors border border-red-500/20"
                      >
                        <Copy size={14} />
                      </button>
                      <div>
                        <h4 className="font-mono text-sm font-bold text-red-400 leading-normal">{selectedTest.errorMsg}</h4>
                        <pre className="font-mono text-xs text-zinc-400 leading-relaxed mt-4 p-4 bg-[#101010] rounded border border-zinc-800 whitespace-pre-wrap overflow-x-auto">
                          {selectedTest.stackTrace}
                        </pre>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-12 text-zinc-500 text-sm border border-zinc-800 border-dashed rounded bg-[#101010]">
                    This test case successfully completed execution without emitting any assertions or warning telemetry logs.
                  </div>
                )}
                
                {selectedTest.diff && (
                  <div className="border border-zinc-800 bg-[#101010] rounded overflow-hidden">
                    <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900 text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                      Object Diff
                    </div>
                    <div className="p-4 font-mono text-xs leading-relaxed select-all">
                      <div className="text-zinc-500">{"{"}</div>
                      <div className="text-zinc-400">&nbsp;&nbsp;"id": "usr_12345",</div>
                      <div className="text-zinc-400">&nbsp;&nbsp;"email": "test@example.com",</div>
                      <div className="bg-red-500/15 text-red-400 px-2 py-0.5 border-l-2 border-l-red-500">&nbsp;&nbsp;- "status": "pending"</div>
                      <div className="bg-green-500/15 text-green-500 px-2 py-0.5 border-l-2 border-l-[#4caf50]">&nbsp;&nbsp;+ "status": "active"</div>
                      <div className="bg-green-500/15 text-green-500 px-2 py-0.5 border-l-2 border-l-[#4caf50]">&nbsp;&nbsp;+ "token": "ey..."</div>
                      <div className="text-zinc-500">{"}"}</div>
                    </div>
                  </div>
                )}

                {/* HTTP Network Details */}
                <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-col gap-4">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex gap-3">
                      <span className="text-zinc-500 uppercase tracking-wider font-bold">Network</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${selectedTest.status === 'Failed' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-400'}`}>
                        {selectedTest.status === 'Failed' ? '500 ERROR' : '200 OK'}
                      </span>
                    </div>
                    <span className="text-zinc-500" title="https://api.test-runner.local/v1/telemetry/evaluate">https://api.test-runner.local/v1/telemetry/evaluate</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#101010] border border-zinc-800 rounded p-4 overflow-x-auto">
                      <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest block mb-2">Headers</span>
                      <div className="text-[10px] font-mono text-zinc-400 whitespace-nowrap space-y-1">
                        <div><span className="text-zinc-500">Content-Type:</span> application/json</div>
                        <div><span className="text-zinc-500">Cache-Control:</span> no-cache</div>
                        <div><span className="text-zinc-500">X-Request-Id:</span> req_{selectedTest.id.substring(0, 8) || 'xyz123'}</div>
                        <div><span className="text-zinc-500">User-Agent:</span> Playwright/1.44.1</div>
                      </div>
                    </div>
                    <div className="bg-[#101010] border border-zinc-800 rounded p-4 overflow-x-auto">
                      <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest block mb-2">Cookies</span>
                      <div className="text-[10px] font-mono text-zinc-400 whitespace-nowrap space-y-1">
                        <div><span className="text-zinc-500">session_id:</span> s_{selectedTest.runId ? selectedTest.runId.substring(0, 6) : '9999'}</div>
                        <div><span className="text-zinc-500">_csrf:</span> token_8x9a</div>
                        <div><span className="text-zinc-500">auth_token:</span> jwt_xxxx_yyyy</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#101010] border border-zinc-800 rounded p-4 mt-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest block mb-3">Waterfall Timeline</span>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden flex">
                      <div className="h-full bg-blue-500/50" style={{ width: '15%' }} title="DNS Lookup: 15%"></div>
                      <div className="h-full bg-amber-500/50" style={{ width: '20%' }} title="Initial Connection: 20%"></div>
                      <div className="h-full bg-purple-500/50" style={{ width: '10%' }} title="SSL: 10%"></div>
                      <div className="h-full bg-green-500/50" style={{ width: '35%' }} title="TTFB: 35%"></div>
                      <div className="h-full bg-cyan-500/50" style={{ width: '20%' }} title="Content Download: 20%"></div>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-2">
                      <span>0ms</span>
                      <span>{selectedTest.duration}</span>
                    </div>
                  </div>
                </div>

              </>
            )}

            {activeTab === 'History' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {selectedTest.history?.map((h, index) => (
                    <div key={index} className="p-4 bg-[#101010] border border-zinc-800 rounded flex justify-between items-center text-sm">
                      <div>
                        <span className="font-mono text-blue-400 font-bold block">{h.runId}</span>
                        <span className="text-[10px] text-zinc-500 font-mono mt-1">{h.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-zinc-400 text-xs">{h.duration}</span>
                        <span className={`text-[10px] font-mono uppercase font-bold border px-2 py-1 rounded ${
                          h.status === 'Passed' ? 'bg-green-500/15 text-green-500 border-green-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'
                        }`}>
                          {h.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Metrics' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#101010] border border-zinc-800 p-6 rounded flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-2 font-bold tracking-widest">Average Speed</span>
                  <span className="font-mono text-3xl font-bold text-white">{selectedTest.duration}</span>
                </div>
                <div className="bg-[#101010] border border-zinc-800 p-6 rounded flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-2 font-bold tracking-widest">Fail Rate</span>
                  <span className="font-mono text-3xl font-bold text-red-400">{selectedTest.status === 'Passed' ? '0%' : '14.2%'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
