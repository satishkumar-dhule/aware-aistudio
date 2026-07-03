const fs = require('fs');
let code = fs.readFileSync('src/components/ComparisonView.tsx', 'utf8');

const parseFunction = `
  // Helper to parse duration string (e.g. "12m 45s", "450ms", "1.2s") into seconds
  const parseDurationToSeconds = (durationStr: string): number => {
    if (!durationStr || durationStr === '--') return 0;
    const cleanStr = durationStr.toLowerCase().trim();
    
    if (cleanStr.endsWith('ms')) {
      return parseFloat(cleanStr.replace('ms', '')) / 1000;
    }
    if (cleanStr.endsWith('s') && !cleanStr.includes('m')) {
      return parseFloat(cleanStr.replace('s', ''));
    }
    
    // Format: "12m 45s"
    let totalSeconds = 0;
    const minMatch = cleanStr.match(/(\\d+)m/);
    const secMatch = cleanStr.match(/(\\d+)s/);
    
    if (minMatch) totalSeconds += parseInt(minMatch[1], 10) * 60;
    if (secMatch) totalSeconds += parseInt(secMatch[1], 10);
    
    return totalSeconds || parseFloat(cleanStr) || 0;
  };
`;

if (!code.includes('const parseDurationToSeconds =')) {
  code = code.replace(
    /  \/\/ Compute stats difference\n  \/\/ Compute stats difference/g,
    parseFunction + "\\n\\n  // Compute stats difference"
  );
  fs.writeFileSync('src/components/ComparisonView.tsx', code);
}
