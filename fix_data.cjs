const fs = require('fs');
let code = fs.readFileSync('src/data.ts', 'utf8');

// For RUN-8492-AX: passRate: 82.1, testsCount: 1405
// 1405 * 0.821 = 1153.5
// let's just make it passedCount: 1154, failedCount: 251, passRate: 82.1
code = code.replace(/passedCount: 1402,/g, 'passedCount: 1154,');
code = code.replace(/failedCount: 3,/g, 'failedCount: 251,');

fs.writeFileSync('src/data.ts', code);
