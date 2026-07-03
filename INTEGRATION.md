# AWARE Telemetry Integration & Pipeline Orchestration Manual

AWARE is a premium, real-time QA & DevOps telemetry analytics deck designed to bridge automated test suites and live dashboard monitoring. This manual outlines how to configure, test, and orchestrate AWARE dynamically inside your automated pipelines (Playwright, Cypress, Vitest, Jest) across multi-stage deployment boundaries.

---

## 1. Architectural Foundation

AWARE operates on a dual-engine data model:
1. **Local Sandbox Mode**: Ideal for active developer previewing, utilizing reactive client-side database modules storing custom records directly inside `localStorage`.
2. **Static Synchronized Mode**: Ideal for continuous integration and static deployments (like GitHub Pages). AWARE automatically polls a remote target JSON file at configurable intervals to sync test outcomes production-wide.

---

## 2. Ingestion Data Contract Specification

Your testing pipelines compile test logs into a unified JSON schema conforming exactly to AWARE's ingestion interface. 

### 2.1 The Data Schema (`telemetry_data.json`)

```json
{
  "version": "1.2.0-secure",
  "runs": [
    {
      "id": "GH-RUN-2810-QA",
      "name": "Regression_Suite_2810",
      "branch": "main",
      "status": "Passed",
      "environment": "QA",
      "duration": "1m 15s",
      "timestamp": "2026-07-02T12:00:00Z",
      "passRate": 100,
      "triggeredBy": "GitHub Actions",
      "commit": "8f3e2b1c0a9d8e7f6c5b4a3d2e1f0a9b8c7d6e5f",
      "testsCount": 24,
      "passedCount": 24,
      "skippedCount": 0,
      "failedCount": 0,
      "suite": "Regression"
    }
  ],
  "testCases": [
    {
      "id": "tc_auth_login_01",
      "name": "auth.spec.ts: Verify single-sign-on credentials integration",
      "suiteId": "reg-auth-01",
      "runId": "GH-RUN-2810-QA",
      "folder": "src/tests/auth",
      "status": "Passed",
      "duration": "310ms",
      "tag": "security",
      "priority": "P0 - Critical"
    }
  ]
}
```

---

## 3. Dynamic Configuration Parameters

AWARE supports runtime parameters stored reactively inside the client session. To customize endpoints without re-building:

* **Static Target Endpoint**: Customize the path or remote URL AWARE fetches from (defaults to `./telemetry_data.json`).
* **AJAX Polling Rate**: Adjust the interval rate (`5s`, `15s`, `30s`, `60s`, or `Manual Only`) to scale network consumption.
* **Synchronization State**: Toggle polling off to return immediately to local sandbox development.

---

## 4. Test Runner Integration Patterns

Configure your test runners to automatically write a telemetry file conforming to the payload specification.

### 4.1 Playwright custom reporter (`aware-reporter.ts`)

```typescript
import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import fs from 'fs';

class AwareReporter implements Reporter {
  private runsCount = 0;
  private passedCount = 0;
  private failedCount = 0;
  private cases: any[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.runsCount++;
    if (result.status === 'passed') this.passedCount++;
    else if (result.status === 'failed') this.failedCount++;

    this.cases.push({
      id: test.id,
      name: test.title,
      status: result.status === 'passed' ? 'Passed' : result.status === 'failed' ? 'Failed' : 'Flaky',
      duration: `${result.duration}ms`,
      priority: 'P1 - High'
    });
  }

  onEnd(result: FullResult) {
    const payload = {
      version: "1.2.0-secure",
      runs: [{
        id: `RUN-${Date.now()}`,
        name: "Playwright Automated Smoke Run",
        branch: process.env.GITHUB_REF_NAME || "local",
        status: result.status === 'passed' ? 'Passed' : 'Failed',
        environment: "QA",
        duration: `${result.duration || 0}ms`,
        timestamp: new Date().toISOString(),
        passRate: Math.round((this.passedCount / this.runsCount) * 100) || 0,
        triggeredBy: process.env.GITHUB_ACTOR || "Local Developer",
        commit: process.env.GITHUB_SHA || "local-head",
        testsCount: this.runsCount,
        passedCount: this.passedCount,
        failedCount: this.failedCount,
        suite: "Smoke"
      }],
      testCases: this.cases
    };
    fs.writeFileSync('dist/telemetry_data.json', JSON.stringify(payload, null, 2));
    console.log('✓ Compiled AWARE telemetries saved to dist/telemetry_data.json');
  }
}
export default AwareReporter;
```

Apply inside `playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test';
export default defineConfig({
  reporter: [['html'], ['./aware-reporter.ts']],
});
```

### 4.2 Cypress dynamic post-run hook (`cypress.config.ts`)

```typescript
import { defineConfig } from "cypress";
import fs from "fs";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('after:run', (results) => {
        if (results && 'runs' in results) {
          const testCases = results.runs.flatMap(run => 
            run.tests.map(test => ({
              id: test.title.join('_').replace(/\s+/g, '-'),
              name: test.title.join(' › '),
              status: test.state === 'passed' ? 'Passed' : 'Failed',
              duration: `${test.duration}ms`,
              priority: 'P1 - High'
            }))
          );
          const payload = {
            version: "1.2.0-secure",
            runs: [{
              id: `CY-${Date.now()}`,
              name: "Cypress Automated Suite Run",
              branch: process.env.GITHUB_REF_NAME || "local",
              status: results.totalFailed === 0 ? 'Passed' : 'Failed',
              environment: "QA",
              passRate: Math.round(((results.totalPassed) / results.totalTests) * 100) || 0,
              triggeredBy: process.env.GITHUB_ACTOR || "Local Developer",
              commit: process.env.GITHUB_SHA || "local-head",
              testsCount: results.totalTests,
              passedCount: results.totalPassed,
              failedCount: results.totalFailed,
              suite: "Regression"
            }],
            testCases
          };
          fs.writeFileSync('dist/telemetry_data.json', JSON.stringify(payload, null, 2));
          console.log('✓ Cypress telemetry compiled to dist/telemetry_data.json');
        }
      });
    },
  },
});
```

---

## 5. Continuous Deployment Workflow Example

Integrate compilation inside your GitHub Actions workflows seamlessly:

```yaml
name: Build and Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install & Build
        run: |
          npm ci
          npm run build

      - name: Execute Tests and Write Data Contract
        run: |
          npm run test:e2e
          # The custom reporter automatically outputs telemetry to dist/telemetry_data.json

      - name: Upload Static Assets
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 6. Multi-Environment Segregation

To track multiple independent deployment environments simultaneously, map the endpoint input to dynamic target routes:

* **QA Pipeline**: Direct outputs to `./telemetry_qa.json` for validation.
* **UAT Pipeline**: Direct outputs to `./telemetry_uat.json` for validation.
* **Production Pipeline**: Direct outputs to `./telemetry_data.json` to lock in core telemetry views.

This enables you to toggling environments inside the top-bar dropdown while dynamically viewing independent live-synced files!
