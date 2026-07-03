const fs = require('fs');
let code = fs.readFileSync('src/components/TestsView.tsx', 'utf8');

code = code.replace(
  "import { \n  Play, \n  Code, \n  Terminal, \n  History, \n  BarChart, \n  Copy, \n  GitCommit, \n  RefreshCw, \n  SlidersHorizontal,\n  ChevronDown,\n  Clock,\n  FolderOpen,\n  Sparkles\n} from 'lucide-react';",
  "import { Play, Code, Terminal, History, BarChart, Copy, GitCommit, RefreshCw, SlidersHorizontal, ChevronDown, Clock, FolderOpen, Sparkles, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';"
);

// Fallback if formatting was different
if (!code.includes('Maximize2')) {
  code = code.replace(
    /import \{[^}]+\} from 'lucide-react';/,
    "import { Play, Code, Terminal, History, BarChart, Copy, GitCommit, RefreshCw, SlidersHorizontal, ChevronDown, Clock, FolderOpen, Sparkles, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';"
  );
}

// Add state if it's missing
if (!code.includes('isFullScreen')) {
  code = code.replace(
    "const [currentPage, setCurrentPage] = useState(1);",
    "const [currentPage, setCurrentPage] = useState(1);\n  const [isFullScreen, setIsFullScreen] = useState(false);"
  );
}

fs.writeFileSync('src/components/TestsView.tsx', code);
