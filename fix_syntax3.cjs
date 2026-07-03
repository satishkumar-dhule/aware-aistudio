const fs = require('fs');
let code = fs.readFileSync('src/components/TestsView.tsx', 'utf8');

code = code.replace(
  "      <aside className=\"w-[360px] flex-col h-full bg-zinc-950 flex shrink-0\">",
  "      <aside className={`${isFullScreen ? 'flex-1' : 'w-[360px] border-l border-zinc-800'} flex-col h-full bg-zinc-950 flex shrink-0`}>"
);
fs.writeFileSync('src/components/TestsView.tsx', code);
