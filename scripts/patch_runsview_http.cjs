const fs = require('fs');
const file = 'src/components/RunsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const anchor = `                        <span className={\`text-[9px] font-mono uppercase font-bold border px-1.5 py-0.5 rounded shrink-0 \${
                          tc.status === 'Passed' 
                            ? 'bg-[#4caf50]/10 text-[#4caf50] border-[#4caf50]/20' 
                            : tc.status === 'Failed' 
                            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }\`}>
                          {tc.status}
                        </span>
                      </div>`;

const newCode = anchor + `
                      
                      {/* HTTP Network Details */}
                      <div className="mt-2 pt-2 border-t border-[#262626] flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <div className="flex gap-2">
                            <span className="text-zinc-500 uppercase tracking-wider font-bold">Network</span>
                            <span className={\`px-1 rounded font-bold \${tc.status === 'Failed' ? 'bg-red-500/10 text-red-500' : 'bg-[#4daeff]/10 text-[#4daeff]'}\`}>
                              {tc.status === 'Failed' ? '500 ERROR' : '200 OK'}
                            </span>
                          </div>
                          <span className="text-zinc-500 truncate max-w-[200px]" title="https://api.aware.internal/v1/telemetry/evaluate">https://api.aware.internal/v1/telemetry/evaluate</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="bg-[#0a0a0a] border border-[#222] rounded p-2 overflow-x-auto">
                            <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-widest block mb-1">Headers</span>
                            <div className="text-[9px] font-mono text-zinc-400 whitespace-nowrap">
                              <div><span className="text-zinc-500">Content-Type:</span> application/json</div>
                              <div><span className="text-zinc-500">Cache-Control:</span> no-cache</div>
                              <div><span className="text-zinc-500">X-Request-Id:</span> req_{tc.id.substring(0, 8) || 'xyz123'}</div>
                              <div><span className="text-zinc-500">User-Agent:</span> Playwright/1.44.1</div>
                            </div>
                          </div>
                          <div className="bg-[#0a0a0a] border border-[#222] rounded p-2 overflow-x-auto">
                            <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-widest block mb-1">Cookies</span>
                            <div className="text-[9px] font-mono text-zinc-400 whitespace-nowrap">
                              <div><span className="text-zinc-500">session_id:</span> s_{tc.runId ? tc.runId.substring(0, 6) : '9999'}</div>
                              <div><span className="text-zinc-500">_csrf:</span> token_8x9a</div>
                              <div><span className="text-zinc-500">auth_token:</span> jwt_xxxx_yyyy</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-[#0a0a0a] border border-[#222] rounded p-2 mt-1">
                          <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-widest block mb-1.5">Waterfall Timeline</span>
                          <div className="w-full bg-[#222] h-1.5 rounded-full overflow-hidden flex">
                            <div className="h-full bg-blue-500/50" style={{ width: '15%' }} title="DNS Lookup: 15%"></div>
                            <div className="h-full bg-amber-500/50" style={{ width: '20%' }} title="Initial Connection: 20%"></div>
                            <div className="h-full bg-purple-500/50" style={{ width: '10%' }} title="SSL: 10%"></div>
                            <div className="h-full bg-green-500/50" style={{ width: '35%' }} title="TTFB: 35%"></div>
                            <div className="h-full bg-cyan-500/50" style={{ width: '20%' }} title="Content Download: 20%"></div>
                          </div>
                          <div className="flex justify-between text-[8px] font-mono text-zinc-600 mt-1">
                            <span>0ms</span>
                            <span>{tc.duration}</span>
                          </div>
                        </div>
                      </div>`;

code = code.replace(anchor, newCode);

fs.writeFileSync(file, code);
