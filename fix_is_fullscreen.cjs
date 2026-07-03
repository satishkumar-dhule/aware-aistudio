const fs = require('fs');
let code = fs.readFileSync('src/components/TestsView.tsx', 'utf8');

if (!code.includes('isFullScreen, setIsFullScreen')) {
  code = code.replace(
    "const [currentPage, setCurrentPage] = useState(1);",
    "const [currentPage, setCurrentPage] = useState(1);\n  const [isFullScreen, setIsFullScreen] = useState(false);"
  );
  fs.writeFileSync('src/components/TestsView.tsx', code);
}
