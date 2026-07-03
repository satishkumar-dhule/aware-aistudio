const fs = require('fs');
let code = fs.readFileSync('src/components/TestsView.tsx', 'utf8');

// Conditionally render left and middle columns
code = code.replace(
  "      {/* Faceted Filters Left column */}\n      <aside",
  "      {/* Faceted Filters Left column */}\n      {!isFullScreen && (\n      <aside"
);
code = code.replace(
  "      {/* Main Middle Pane (List of Test Cases) */}\n      <section",
  "      </aside>\n      )}\n\n      {/* Main Middle Pane (List of Test Cases) */}\n      {!isFullScreen && (\n      <section"
);

code = code.replace(
  "        </div>\n      </section>\n      {/* Right Column: Detail Pane (Comprehensive execution logs, error output, diffs) */}\n      <aside className=\"w-[360px] flex-col h-full bg-zinc-950 flex shrink-0\">",
  "        </div>\n      </section>\n      )}\n\n      {/* Right Column: Detail Pane (Comprehensive execution logs, error output, diffs) */}\n      <aside className={`${isFullScreen ? 'flex-1' : 'w-[360px] border-l border-zinc-800'} flex-col h-full bg-zinc-950 flex shrink-0`}>"
);

// Navigation buttons and fullscreen
const navCode = `                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-1 border border-zinc-800 rounded bg-zinc-900 p-0.5">
                    <button 
                      onClick={() => {
                        const idx = filteredTests.findIndex(t => t.id === selectedTest.id);
                        if (idx > 0) setSelectedTest(filteredTests[idx - 1]);
                      }}
                      disabled={!filteredTests || filteredTests.findIndex(t => t.id === selectedTest?.id) <= 0}
                      className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        const idx = filteredTests.findIndex(t => t.id === selectedTest.id);
                        if (idx < filteredTests.length - 1) setSelectedTest(filteredTests[idx + 1]);
                      }}
                      disabled={!filteredTests || filteredTests.findIndex(t => t.id === selectedTest?.id) >= filteredTests.length - 1}
                      className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="p-1 border border-zinc-800 rounded hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 bg-zinc-900 transition-colors"
                    title="Toggle Full Screen"
                  >
                    {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button`;
code = code.replace(
  "                <div className=\"flex gap-2\">\n                  <button",
  navCode
);

fs.writeFileSync('src/components/TestsView.tsx', code);
