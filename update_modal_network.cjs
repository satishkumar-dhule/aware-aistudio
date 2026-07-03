const fs = require('fs');
let code = fs.readFileSync('src/components/TestCaseModal.tsx', 'utf8');

const networkDetails = `
                {/* HTTP Network Details */}
                <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-col gap-4">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex gap-3">
                      <span className="text-zinc-500 uppercase tracking-wider font-bold">Network</span>
                      <span className={\`px-2 py-0.5 rounded font-bold \${selectedTest.status === 'Failed' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-400'}\`}>
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
`;

code = code.replace(
  /                  <\/div>\n                \)}\n              <\/>\n            \)}/g,
  `                  </div>
                )}
${networkDetails}
              </>
            )}`
);

fs.writeFileSync('src/components/TestCaseModal.tsx', code);
