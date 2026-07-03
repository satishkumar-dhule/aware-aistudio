const fs = require('fs');
let code = fs.readFileSync('src/components/TestsView.tsx', 'utf8');

// The aside ends right before "Tests List column"
code = code.replace(
  "      </aside>\n      {/* Tests List column */}",
  "      </aside>\n      )}\n      {/* Tests List column */}\n      {!isFullScreen && ("
);

// The section ends right before "Right Column: Detail Pane"
code = code.replace(
  "      </section>\n      {/* Right Column: Detail Pane",
  "      </section>\n      )}\n      {/* Right Column: Detail Pane"
);

fs.writeFileSync('src/components/TestsView.tsx', code);
