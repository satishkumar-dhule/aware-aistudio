const fs = require('fs');
let code = fs.readFileSync('src/components/TestsView.tsx', 'utf8');

code = code.replace(
  "      </aside>\n      {/* Tests List column */}\n      <section className=\"flex-1",
  "      </aside>\n      )}\n      {/* Tests List column */}\n      {!isFullScreen && (\n      <section className=\"flex-1"
);
fs.writeFileSync('src/components/TestsView.tsx', code);
