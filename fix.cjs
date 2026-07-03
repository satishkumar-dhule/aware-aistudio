const fs = require('fs');
let code = fs.readFileSync('src/components/RunsView.tsx', 'utf8');

code = code.replace(
  /  Sparkles\n  \} from "lucide-react";\n\} from 'lucide-react';/g,
  "  Sparkles,\n  Maximize2\n} from 'lucide-react';"
);

fs.writeFileSync('src/components/RunsView.tsx', code);
