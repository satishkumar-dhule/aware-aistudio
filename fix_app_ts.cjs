const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const \[lastSyncTime, setLastSyncTime\] = useState<Date \| null>\(null\);/g,
  "const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);\n  const [simulationMode, setSimulationMode] = useState(false);"
);

code = code.replace(
  /              onShowToast=\{showToast\}\n            \/>/g,
  "              onShowToast={showToast}\n              simulationMode={simulationMode}\n              onToggleSimulation={() => setSimulationMode(!simulationMode)}\n            />"
);

fs.writeFileSync('src/App.tsx', code);
