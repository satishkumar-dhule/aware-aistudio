const fs = require('fs');
let code = fs.readFileSync('src/components/ComparisonView.tsx', 'utf8');

const presetFunc = `
  const handlePreset = (type: 'reg' | 'sec' | 'smoke') => {
    if (type === 'reg') {
      setRunAId('RUN-8491-BZ');
      setRunBId('RUN-8492-AX');
    } else if (type === 'sec') {
      setRunAId('RUN-9479-sec');
      setRunBId('RUN-9482-sec');
    } else if (type === 'smoke') {
      setRunAId('RUN-9479-sec');
      setRunBId('RUN-9480-smk');
    }
    setActiveFilter('all');
    setExpandedTestId(null);
  };
`;

if (!code.includes('const handlePreset =')) {
  code = code.replace(
    /  \/\/ Compute stats difference/g,
    presetFunc + "\\n  // Compute stats difference"
  );
  fs.writeFileSync('src/components/ComparisonView.tsx', code);
}
