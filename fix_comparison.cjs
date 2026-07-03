const fs = require('fs');
let code = fs.readFileSync('src/components/ComparisonView.tsx', 'utf8');

const replacement = `
  const runA = useMemo(() => runs.find(r => r.id === runAId) || runs[0], [runAId, runs]);
  const runB = useMemo(() => runs.find(r => r.id === runBId) || runs[1] || runs[0], [runBId, runs]);

  if (!runA || !runB) {
    return (
      <div className="flex-1 p-8 overflow-y-auto bg-[#0a0a0a] text-white font-sans flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Not enough runs to compare. At least 2 runs are required.</div>
      </div>
    );
  }

  // Compute stats difference
`;

code = code.replace(
  /  const runA = useMemo\(\(\) => runs\.find\(r => r\.id === runAId\) \|\| runs\[0\], \[runAId, runs\]\);\n  const runB = useMemo\(\(\) => runs\.find\(r => r\.id === runBId\) \|\| runs\[1\], \[runBId, runs\]\);[\s\S]*?\/\/ Compute stats difference/m,
  replacement.trim() + '\n  // Compute stats difference'
);

fs.writeFileSync('src/components/ComparisonView.tsx', code);
