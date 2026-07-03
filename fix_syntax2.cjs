const fs = require('fs');
let code = fs.readFileSync('src/components/TestsView.tsx', 'utf8');

code = code.replace(
  "      </section>\n      {/* Right Column: Detail Pane",
  "      </section>\n      )}\n      {/* Right Column: Detail Pane"
);
fs.writeFileSync('src/components/TestsView.tsx', code);
