const fs = require('fs');

const file = 'src/components/TestsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add runFilter state
code = code.replace(
  `const [statusFilters, setStatusFilters] = useState({`,
  `const [runFilter, setRunFilter] = useState<string | null>(null);\n  const [statusFilters, setStatusFilters] = useState({`
);

// Update useEffect for selectedTestId
const oldEffect = `  useEffect(() => {
    if (selectedTestId) {
      const match = testCases.find(t => t.id === selectedTestId);
      if (match) {
        setSelectedTest(match);
      }
    }
  }, [selectedTestId, testCases]);`;

const newEffect = `  useEffect(() => {
    if (selectedTestId) {
      const match = testCases.find(t => t.id === selectedTestId);
      if (match) {
        setSelectedTest(match);
        setRunFilter(match.runId);
      }
    }
  }, [selectedTestId, testCases]);`;

code = code.replace(oldEffect, newEffect);

// Update filter function
const oldFilter = `      // Environment filter
      let matchesEnv = true;
      if (activeEnv !== 'All') {`;

const newFilter = `      // Run filter
      if (runFilter && tc.runId !== runFilter) return false;

      // Environment filter
      let matchesEnv = true;
      if (activeEnv !== 'All') {`;

code = code.replace(oldFilter, newFilter);

// Add Clear Run Filter UI
const oldClearBtn = `<button onClick={handleFilterReset} className="text-[9px] font-mono font-bold uppercase text-[#4daeff] hover:underline">Clear</button>`;
const newClearBtn = `<button onClick={handleFilterReset} className="text-[9px] font-mono font-bold uppercase text-[#4daeff] hover:underline">Clear Filters</button>`;
code = code.replace(oldClearBtn, newClearBtn);

// Add Run Filter UI block
const filterGroups = `        {/* Filter groups */}
        <div className="p-4 space-y-5">`;

const runFilterUI = `        {/* Filter groups */}
        <div className="p-4 space-y-5">
          {runFilter && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500">Active Run</h3>
                <button onClick={() => setRunFilter(null)} className="text-[9px] font-mono uppercase text-red-400 hover:underline">Clear</button>
              </div>
              <div className="bg-[#1a1a1a] p-2 rounded border border-[#262626] text-[10px] font-mono text-zinc-300 truncate">
                {runFilter}
              </div>
            </div>
          )}`;

code = code.replace(filterGroups, runFilterUI);

// Reset runFilter in handleFilterReset
code = code.replace(
  `setStatusFilters({ Failed: true, Flaky: true, Passed: true });`,
  `setRunFilter(null);\n    setStatusFilters({ Failed: true, Flaky: true, Passed: true });`
);

// update dependencies in useMemo
code = code.replace(
  `[searchQuery, statusFilters, priorityFilters, sortBy, activeEnv]);`,
  `[searchQuery, statusFilters, priorityFilters, sortBy, activeEnv, runFilter]);`
);

fs.writeFileSync(file, code);
