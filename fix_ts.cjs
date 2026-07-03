const fs = require('fs');

// 1. Fix AnalyticsView.tsx
let analyticsCode = fs.readFileSync('src/components/AnalyticsView.tsx', 'utf8');
analyticsCode = analyticsCode.replace(/import \{ BrowserDb \} from '\.\.\/lib\/browserDb';\nimport TestCaseModal from '\.\/TestCaseModal';\nimport \{\n  TestCase,/g, "import { BrowserDb } from '../lib/browserDb';\nimport TestCaseModal from './TestCaseModal';\nimport { TestCase } from '../types';\nimport {");
fs.writeFileSync('src/components/AnalyticsView.tsx', analyticsCode);

// 2. Fix browserDb.ts
let dbCode = fs.readFileSync('src/lib/browserDb.ts', 'utf8');
dbCode = dbCode.replace(/status: isFailedTC \? 'Failed' : 'Passed',/g, "status: isFailedTC ? 'Failed' as const : 'Passed' as const,");
fs.writeFileSync('src/lib/browserDb.ts', dbCode);
