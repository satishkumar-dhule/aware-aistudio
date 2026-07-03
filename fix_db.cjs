const fs = require('fs');
let code = fs.readFileSync('src/lib/browserDb.ts', 'utf8');

const replacement = `
      // Create specific tests for this environment
      const envTests = Array.from({ length: 120 }).map((_, i) => {
        const isFailedTC = i < newRun.failedCount;
        return {
          id: \`gh_test_\${env.toLowerCase()}_\${runNum}_\${i}\`,
          name: \`module_\${Math.floor(i / 10)}.spec.ts: Subtest \${i} [Sched \${runNum}]\`,
          suiteId: suiteName,
          runId: runId,
          folder: \`test/gh-workflows/\${env.toLowerCase()}\`,
          status: isFailedTC ? 'Failed' : 'Passed',
          duration: \`\${Math.floor(100 + Math.random() * 800)}ms\`,
          tag: i % 3 === 0 ? 'api' : 'e2e',
          priority: isFailedTC ? 'P1 - High' : 'P2 - Medium',
          errorMsg: isFailedTC ? \`AssertionError: Expected 200 OK from \${env} environment gateway, got 504 Gateway Timeout\` : undefined,
          stackTrace: isFailedTC ? \`at test/gh-workflows/api.spec.ts:54\\nat processTicksAndRejections\\nat github-actions-runner-node\` : undefined,
        };
      });
      newTestCasesList.push(...envTests);
`;

code = code.replace(
  /      \/\/ Create specific tests for this environment[\s\S]*?      \);/m,
  replacement.trim()
);

fs.writeFileSync('src/lib/browserDb.ts', code);
