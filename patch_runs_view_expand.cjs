const fs = require('fs');
let code = fs.readFileSync('src/components/RunsView.tsx', 'utf8');

// Import Maximize2
if (!code.includes('Maximize2')) {
  code = code.replace(
    "} from 'lucide-react';",
    "  Maximize2,\n} from 'lucide-react';"
  );
}

// Ensure the outer div doesn't prevent highlighting by just being a normal div, but let's keep onClick since it's nice, but add stopPropagation to inner ones if needed. Wait, actually, let's just make it clear with a button.
code = code.replace(
  "                      <div className=\"flex justify-between items-start gap-2\">\n                        <div>",
  `                      <div className="flex justify-between items-start gap-2">
                        <div>`
);

const statusBadge = `<span className={\`text-[9px] font-mono uppercase font-bold border px-1.5 py-0.5 rounded shrink-0 \${
                          tc.status === 'Passed' 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : tc.status === 'Failed' 
                            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }\`}>
                          {tc.status}
                        </span>`;

const newStatusWithExpand = `<div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setModalTestCaseId(tc.id); }}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                            title="Expand Details"
                          >
                            <Maximize2 size={14} />
                          </button>
                          <span className={\`text-[9px] font-mono uppercase font-bold border px-1.5 py-0.5 rounded shrink-0 \${
                            tc.status === 'Passed' 
                              ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                              : tc.status === 'Failed' 
                              ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }\`}>
                            {tc.status}
                          </span>
                        </div>`;

code = code.replace(statusBadge, newStatusWithExpand);

fs.writeFileSync('src/components/RunsView.tsx', code);
