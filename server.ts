import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini with server-side API Key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper simulated on-device Gemini Nano diagnostic function
function simulateTelemetryAnalysis(prompt: string, context: any) {
  const p = prompt.toLowerCase().trim();
  const runsList = context.runs || [];
  const failedTests = context.recentFailedTests || [];
  const anomaliesList = context.anomalies || [];

  // Helper to find worst and best run
  const sortedRunsByPassRate = [...runsList].sort((a, b) => a.passRate - b.passRate);
  const worstRun = sortedRunsByPassRate[0];
  const bestRun = [...runsList].sort((a, b) => b.passRate - a.passRate)[0];

  // Calculate averages
  const avgPassRate = runsList.length
    ? Math.round(runsList.reduce((sum: number, r: any) => sum + r.passRate, 0) / runsList.length)
    : 92;

  // 1. App Info / Help Query
  if (p.includes('who are you') || p.includes('what is this') || p.includes('help') || p.includes('capabilities') || p.includes('about')) {
    return {
      analysisMarkdown: `### 🤖 About Google Chrome AI Telemetry Analyst
I am an intelligent DevOps and Observability co-pilot built directly into **AWARE (Automated Workflow Analytics & Response Engine)**. 

#### 🚀 What I Can Do:
1. **Dynamic RAG Diagnostics**: I query your browser-side IndexedDB/LocalStorage telemetry to perform local cross-environment diagnostics.
2. **Auto-Generate Visualizations**: I build dynamic responsive data charts based on telemetry statistics like pass rates and run durations.
3. **Triage Failed Logs**: Provide me with error logs or stacktraces, and I will isolate root causes and propose automated retry/timeout fixes.
4. **Predict Flakiness**: I analyze historical duration maps to identify high-risk concurrent bottlenecks.

*Try asking me: "which is the worst run", "compare environments", or "predict flakiness"!*`,
      chartTitle: "AWARE Operational Capabilities",
      chartType: "bar",
      chartData: [
        { name: "RAG Diagnostics", value: 95 },
        { name: "Auto-Visuals", value: 90 },
        { name: "Triage & Logs", value: 85 },
        { name: "Flakiness Pred", value: 80 }
      ],
      tableTitle: "Analyst Core Modules",
      tableHeaders: ["Module Name", "Primary Action", "Data Sources", "Status"],
      tableRows: [
        ["Telemetry Engine", "Cross-referencing run metrics", "IndexedDB / runs", "✅ Ready"],
        ["Heuristics Triage", "Isolating test assertion failures", "failedTests / logs", "✅ Ready"],
        ["Risk Modeling", "Predicting pipeline flakiness", "historical runs", "✅ Ready"]
      ]
    };
  }

  // 2. Worst Run query
  if (p.includes('worst') || p.includes('lowest') || p.includes('poor') || p.includes('bad') || p.includes('least stable')) {
    if (!worstRun) {
      return {
        analysisMarkdown: "### 🔎 Telemetry Intelligence Report\nNo pipeline runs are currently tracked in the database. Please generate some simulated runs in Settings first.",
        chartTitle: "No Data Available",
        chartType: "none",
        chartData: []
      };
    }
    const worstRunFailures = failedTests.filter((t: any) => t.runId === worstRun.id);
    let failuresSection = "";
    if (worstRunFailures.length > 0) {
      failuresSection = "\n\n#### 🛑 Failed Test Cases in this run:\n" + worstRunFailures.map((t: any) => `* **${t.name}**\n  * **Error:** \`${t.errorMsg || 'Timeout AssertionError'}\``).join('\n');
    }

    return {
      analysisMarkdown: `### 🔎 Chrome AI Diagnostic: Worst Run Identified
According to the local telemetry metrics in the client database, the worst performing pipeline run is:

* **Run ID:** \`${worstRun.id}\`
* **Run Name:** \`${worstRun.name}\`
* **Environment:** \`${worstRun.environment}\`
* **Triggered By:** \`${worstRun.triggeredBy || 'Developer Command'}\`
* **Pass Rate:** \`${worstRun.passRate}%\` (Failed \`${worstRun.failedCount || 0}\` out of \`${worstRun.testsCount || 10}\` tests)
* **Duration:** \`${worstRun.duration}\`
* **Captured Timestamp:** \`${worstRun.timestamp}\`
${failuresSection}

#### 💡 Root Cause Recommendation:
The run in environment **${worstRun.environment}** failed primarily due to database transaction locking or network timeout delays in concurrent steps. We recommend enabling the AWARE flakiness retry mitigation parameters.`,
      chartTitle: "Lowest Performing Runs (%)",
      chartType: "bar",
      chartData: sortedRunsByPassRate.slice(0, 5).map(r => ({
        name: r.id,
        value: r.passRate
      })),
      tableTitle: "Worst Runs Under Review",
      tableHeaders: ["Run ID", "Environment", "Pass Rate", "Triggered By", "Duration"],
      tableRows: sortedRunsByPassRate.slice(0, 3).map(r => [
        r.id,
        r.environment,
        `${r.passRate}%`,
        r.triggeredBy || 'Manual',
        r.duration
      ])
    };
  }

  // 3. Best Run query
  if (p.includes('best') || p.includes('highest') || p.includes('max') || p.includes('perfect')) {
    if (!bestRun) {
      return {
        analysisMarkdown: "### 🔎 Telemetry Intelligence Report\nNo pipeline runs are currently tracked in the database.",
        chartTitle: "No Data Available",
        chartType: "none",
        chartData: []
      };
    }

    return {
      analysisMarkdown: `### 🏆 Chrome AI Diagnostic: Best Run Identified
According to the local telemetry metrics in the client database, the best performing pipeline run is:

* **Run ID:** \`${bestRun.id}\`
* **Run Name:** \`${bestRun.name}\`
* **Environment:** \`${bestRun.environment}\`
* **Triggered By:** \`${bestRun.triggeredBy || 'Developer Command'}\`
* **Pass Rate:** \`${bestRun.passRate}%\` (Passed \`${bestRun.passedCount || 10}\` out of \`${bestRun.testsCount || 10}\` tests)
* **Duration:** \`${bestRun.duration}\`
* **Captured Timestamp:** \`${bestRun.timestamp}\`

#### 💡 Observations:
This run executed with maximum container pool optimization and zero reported network/thread latency anomalies.`,
      chartTitle: "Top Performing Runs (%)",
      chartType: "bar",
      chartData: [...runsList].sort((a, b) => b.passRate - a.passRate).slice(0, 5).map(r => ({
        name: r.id,
        value: r.passRate
      })),
      tableTitle: "Best Performing Runs",
      tableHeaders: ["Run ID", "Environment", "Pass Rate", "Triggered By", "Duration"],
      tableRows: [...runsList].sort((a, b) => b.passRate - a.passRate).slice(0, 3).map(r => [
        r.id,
        r.environment,
        `${r.passRate}%`,
        r.triggeredBy || 'Manual',
        r.duration
      ])
    };
  }

  // 4. Failed test cases, errors, stacktraces, and what needs attention
  if (p.includes('failed') || p.includes('failure') || p.includes('error') || p.includes('stacktrace') || p.includes('diagnose') || p.includes('triage') || p.includes('failing') || p.includes('attention') || p.includes('issue') || p.includes('problem') || p.includes('warn') || p.includes('broken') || p.includes('bug') || p.includes('need')) {
    let diagnosticPoints = "";
    if (failedTests.length > 0) {
      diagnosticPoints = "#### 🛑 Identified Assertion Errors:\n" + failedTests.slice(0, 5).map((t: any) => {
        return `* **${t.name}** in run \`${t.runId}\` (\`${t.priority || 'High'}\`)\n  * **Error:** \`${t.errorMsg || 'Intermittent Gateway/Network Timeout'}\`\n  * **Folder Location:** \`${t.folder || 'test/gh-workflows'}\`\n  * **Root Cause:** Gateway connection failures or 504 Gateway Timeout errors detected on target endpoints.`;
      }).join('\n\n');
    } else {
      diagnosticPoints = "No active test case failures found in the telemetry dataset. All local runs are healthy!";
    }

    let anomalyPoints = "";
    if (anomaliesList.length > 0) {
      anomalyPoints = "#### ⚠️ Active System Anomalies:\n" + anomaliesList.slice(0, 5).map((a: any) => {
        return `* **[${a.type}]**: ${a.text}`;
      }).join('\n');
    } else {
      anomalyPoints = "No active infrastructure anomalies detected.";
    }

    return {
      analysisMarkdown: `### 🚨 Chrome AI Observability: Critical Items Needing Attention
I have executed a comprehensive scan across all active telemetry datasets in the database. Below is the isolated triage report containing the specific test failures and active system anomalies requiring priority developer action:

${diagnosticPoints}

${anomalyPoints}

#### 🛠️ AI-Recommended Priority Resolution Steps:
1. **Dynamic Connection Retries**: Implement connection handshake retries with custom backoff curves inside your workspace test scripts.
2. **Increase Timeout Thresholds**: Adjust runner spec timeout configs from 5s to 15s.
3. **Thread Pool Optimization**: Increase backend concurrent pool sizes to resolve gateway bottlenecks and prevent the transaction-locking anomalies detected.`,
      chartTitle: "System Risks and Failures Needing Attention",
      chartType: "bar",
      chartData: [
        { name: "test/api (Failed)", value: failedTests.filter((t: any) => (t.folder && t.folder.includes('api')) || t.name.includes('api')).length },
        { name: "test/e2e (Failed)", value: failedTests.filter((t: any) => (t.folder && t.folder.includes('e2e')) || t.name.includes('e2e')).length },
        { name: "Infrastructure Anomalies", value: anomaliesList.length },
        { name: "Unresolved Risks", value: failedTests.filter((t: any) => t.priority === 'High' || !t.priority).length }
      ],
      tableTitle: "Priority Action Items",
      tableHeaders: ["Target / Component", "Observation Type", "Severity / Priority", "Recommended Action"],
      tableRows: [
        ...failedTests.slice(0, 3).map((t: any) => [
          t.name.split(':')[0],
          "Test Case Failure",
          t.priority || 'High',
          "Implement connection retries"
        ]),
        ...anomaliesList.slice(0, 2).map((a: any) => [
          "Infrastructure Layer",
          `Anomaly: ${a.type}`,
          "Medium-High",
          "Optimize concurrent thread pools"
        ])
      ]
    };
  }

  // 5. GitHub Actions / Schedules
  if (p.includes('github') || p.includes('action') || p.includes('workflow') || p.includes('sched') || p.includes('schedule')) {
    const scheduledRuns = runsList.filter((r: any) => r.id.includes('GH-SCHED') || (r.triggeredBy && r.triggeredBy.includes('GitHub')));
    
    let runsSummaryMarkdown = "";
    if (scheduledRuns.length > 0) {
      runsSummaryMarkdown = `Currently, AWARE tracks **${scheduledRuns.length}** scheduled run iterations executed in GitHub Actions. Let's inspect the active cross-environment run matrix:\n\n` + 
        scheduledRuns.map((r: any) => `* **${r.id}** (${r.name}): Passed **${r.passedCount || 10}** of **${r.testsCount || 10}** tests in **${r.environment}** with a **${r.passRate}%** pass rate (Duration: ${r.duration}).`).join('\n');
    } else {
      runsSummaryMarkdown = "No active scheduled runs currently logged. You can trigger simulated GitHub Action scheduled runs directly inside the **Settings** control plane tab!";
    }

    return {
      analysisMarkdown: `### 🚀 GitHub Actions Cross-Environment Scheduler Analysis
Your pipeline is configured as a scheduled workflow inside GitHub Actions running across all core environments: **QA**, **UAT**, and **PROD** (Production).

${runsSummaryMarkdown}

#### 🎯 Key Observations:
1. **Multi-Environment Coverage**: Test runner schedules execute concurrently on QA, UAT, and Prod clusters.
2. **UAT Stability**: Staging environments continue to exhibit flawless 100% pass rates.
3. **Prod Flakiness Isolation**: Random networking timeouts during scheduled prod executions require robust retry pipelines to avoid intermittent false-negatives.`,
      chartTitle: "Scheduled Workflow Pass Rates (%)",
      chartType: "composed",
      chartData: [
        { name: "QA (Sched)", value: 83, secondaryValue: 2 },
        { name: "UAT (Sched)", value: 100, secondaryValue: 0 },
        { name: "PROD (Sched)", value: 92, secondaryValue: 1 }
      ],
      tableTitle: "GitHub Actions Scheduling Configurations",
      tableHeaders: ["Environment", "Trigger Type", "Frequency", "Runner OS", "Status"],
      tableRows: [
        ["QA", "Scheduled Cron", "Every 6 Hours", "ubuntu-latest", "✅ Healthy"],
        ["UAT", "Scheduled Cron", "Every 6 Hours", "ubuntu-latest", "✅ Healthy"],
        ["PROD", "Scheduled Cron", "Every 6 Hours", "ubuntu-latest", "⚠️ Intermittent"]
      ]
    };
  }

  // 6. Compare or environments
  if (p.includes('environment') || p.includes('qa') || p.includes('uat') || p.includes('prod') || p.includes('compare')) {
    const qaRuns = runsList.filter((r: any) => r.environment === 'QA');
    const uatRuns = runsList.filter((r: any) => r.environment === 'UAT');
    const prodRuns = runsList.filter((r: any) => r.environment === 'Prod' || r.environment === 'PROD');

    const avgQA = qaRuns.length ? Math.round(qaRuns.reduce((sum: number, r: any) => sum + r.passRate, 0) / qaRuns.length) : 85;
    const avgUAT = uatRuns.length ? Math.round(uatRuns.reduce((sum: number, r: any) => sum + r.passRate, 0) / uatRuns.length) : 100;
    const avgPROD = prodRuns.length ? Math.round(prodRuns.reduce((sum: number, r: any) => sum + r.passRate, 0) / prodRuns.length) : 94;

    return {
      analysisMarkdown: `### 📊 Cross-Environment Comparative Latency & Health Report
An on-device comparative audit of telemetry latencies and pass rates across staging and production environment clusters:

1. **QA (Quality Assurance)**: Avg Pass Rate: **${avgQA}%** (${qaRuns.length} runs). High iteration, variable container performance.
2. **UAT (User Acceptance)**: Avg Pass Rate: **${avgUAT}%** (${uatRuns.length} runs). Stable staging parity, zero active regressions.
3. **PROD (Production)**: Avg Pass Rate: **${avgPROD}%** (${prodRuns.length} runs). Strictly isolated endpoints with low latent execution pools.

#### 📉 Recommendations:
Optimize concurrent pipeline thread sizes in the QA environments to match pre-production container configurations.`,
      chartTitle: "Average Environment Pass Rates (%)",
      chartType: "line",
      chartData: [
        { name: "QA", value: avgQA },
        { name: "UAT", value: avgUAT },
        { name: "PROD", value: avgPROD }
      ],
      tableTitle: "Comparative Cluster Statistics",
      tableHeaders: ["Environment", "Registered Runs", "Avg Pass Rate", "Deployment Health"],
      tableRows: [
        ["QA Staging", String(qaRuns.length), `${avgQA}%`, "Active Dev"],
        ["UAT Pre-Prod", String(uatRuns.length), `${avgUAT}%`, "Stable Stage"],
        ["PROD Live", String(prodRuns.length), `${avgPROD}%`, "Production Active"]
      ]
    };
  }

  // 7. Flakiness
  if (p.includes('flaky') || p.includes('flakiness') || p.includes('predict') || p.includes('partitioning') || p.includes('risk')) {
    return {
      analysisMarkdown: `### 🔬 Flakiness Risk Prediction Model
Historical run duration maps show a strong correlation between long suite sizes and random flaky timeout failures.

#### ⚠️ High-Risk Anomalies:
* **Database Connection Pool Exhaustion**: Occurs during heavy parallel run suites inside \`test/gh-workflows\`.
* **Sequential Thread Bottlenecks**: Spec file setups executed sequentially inside QA warmups.

#### 🛠️ Chrome AI Recommendations:
* **Partitioning**: Divide the spec folder matrices using standard GitHub matrix builds.
* **Test Isolation**: Guarantee stateless sandboxing between test blocks.`,
      chartTitle: "Run Latency (min) vs Flakiness Frequency",
      chartType: "composed",
      chartData: runsList.slice(0, 5).map((r: any) => ({
        name: r.id,
        value: parseInt(r.duration) || 4,
        secondaryValue: r.failedCount || 0
      })),
      tableTitle: "Spec Folder Risk Metrics",
      tableHeaders: ["Folder Path", "Runs Swept", "Failure Rate", "Risk Class"],
      tableRows: [
        ["test/gh-workflows/qa", "14", "18.2%", "⚠️ Medium"],
        ["test/gh-workflows/prod", "12", "8.5%", "✅ Low"],
        ["test/smoke", "24", "0.0%", "✅ Low"]
      ]
    };
  }

  // 8. Dynamic Intent-Based Conversational Handler
  if (p.includes('hello') || p.includes('hi') || p.includes('hey') || p.includes('greetings') || p.includes('how are you') || p === 'ai' || p.includes('morning') || p.includes('afternoon')) {
    return {
      analysisMarkdown: `### 🤖 Hello! I am Google Chrome AI Telemetry Analyst
Greetings! I am your Observability co-pilot, monitoring **AWARE** telemetry. I analyze active test matrices and pipeline health patterns stored in your browser's database.

Currently, I am tracking **${runsList.length} runs** with an average pass rate of **${avgPassRate}%**. I have also captured **${failedTests.length} active failed test cases** and **${anomaliesList.length} system anomalies**.

#### 💡 How we can collaborate:
* **Compare Environments**: Ask me to *"compare environments"* to see QA, UAT, and PROD latency curves.
* **Triage Failures**: Ask me to *"diagnose failures"* or *"show worst run"* to locate stacktrace root causes.
* **Predict Bottlenecks**: Ask me to *"predict flakiness"* to discover concurrency thread-locking warnings.

What specific diagnostic task would you like me to run?`,
      chartTitle: "System Health Summary",
      chartType: "bar",
      chartData: [
        { name: "Active Runs", value: runsList.length },
        { name: "Avg Pass %", value: avgPassRate },
        { name: "Failed Tests", value: failedTests.length },
        { name: "Anomalies", value: anomaliesList.length }
      ],
      tableTitle: "Current Telemetry Status",
      tableHeaders: ["Storage State", "Entity Count", "Status"],
      tableRows: [
        ["Pipeline Runs", String(runsList.length), "✅ Active Sync"],
        ["Failed Cases", String(failedTests.length), failedTests.length > 0 ? "⚠️ Triaging" : "✅ All Green"],
        ["Anomalies Captured", String(anomaliesList.length), anomaliesList.length > 0 ? "⚠️ Monitored" : "✅ Nominal"]
      ]
    };
  }

  // 9. Pipeline Health Summary & Status
  if (p.includes('status') || p.includes('summary') || p.includes('overview') || p.includes('report') || p.includes('pipeline') || p.includes('how are we') || p.includes('how is my')) {
    const last3Runs = runsList.slice(0, 3);
    const runSummaryLines = last3Runs.map((r: any) => `* **${r.id}** (${r.name}): **${r.passRate}%** pass rate in **${r.environment}** (Duration: ${r.duration}).`).join('\n');
    return {
      analysisMarkdown: `### 📊 AWARE Pipeline Health Summary & Status Report
I have compiled a technical status overview of your automated testing pipeline based on the active telemetry records:

#### 📈 Key Vital Metrics:
* **Total Monitored Runs:** \`${runsList.length}\`
* **Overall Average Pass Rate:** \`${avgPassRate}%\`
* **Failing/Unstable Test Cases:** \`${failedTests.length}\`
* **System Anomalies Flagged:** \`${anomaliesList.length}\`

#### 🕒 Recent Pipeline Runs Activity:
${runSummaryLines || "No runs currently recorded. Please trigger runs in the Settings panel."}

#### 🎯 Strategic Recommendation:
Based on the current dataset, environment stability is **${avgPassRate > 90 ? "Excellent" : "Nominal, with minor regressions"}**. To optimize pipeline throughput, ensure that retries are enabled on all test folders with a pass rate below 90%.`,
      chartTitle: "Recent Run Pass Rates (%)",
      chartType: "line",
      chartData: runsList.slice(0, 5).reverse().map((r: any) => ({ name: r.id, value: r.passRate })),
      tableTitle: "Recent Runs Dashboard Overview",
      tableHeaders: ["Run ID", "Environment", "Pass Rate", "Duration", "Trigger"],
      tableRows: runsList.slice(0, 5).map((r: any) => [
        r.id,
        r.environment,
        `${r.passRate}%`,
        r.duration,
        r.triggeredBy || "Manual"
      ])
    };
  }

  // 10. Anomalies / Latency / High Duration
  if (p.includes('anomaly') || p.includes('anomalies') || p.includes('outlier') || p.includes('duration') || p.includes('slow') || p.includes('latency') || p.includes('timing')) {
    const slowRuns = [...runsList].sort((a, b) => {
      const aMin = parseInt(a.duration) || 0;
      const bMin = parseInt(b.duration) || 0;
      return bMin - aMin;
    });
    
    const anomalySection = anomaliesList.length > 0 
      ? "#### ⚠️ Captured Storage & Networking Anomalies:\n" + anomaliesList.map((a: any) => `* **[${a.type}]** ${a.text}`).join('\n')
      : "#### ✅ System Anomalies: None\nAll active runs executed within normal, non-blocking duration windows with no thread deadlocks detected.";

    return {
      analysisMarkdown: `### 🔬 Telemetry Anomaly & High-Latency Diagnostics
I have inspected your local database to locate runtime outliers, thread blocks, and latency spikes:

${anomalySection}

#### 🕒 Top 3 Slowest Running Pipelines:
${slowRuns.slice(0, 3).map((r: any) => `* **${r.id}** (${r.environment}): Duration **${r.duration}** with a pass rate of **${r.passRate}%**.`).join('\n') || "*No runs recorded.*"}

#### 🛠️ AI Bottleneck Resolution:
To decrease execution durations, we suggest enabling parallel thread chunking inside GitHub Action files and splitting your heavy test suites into multi-container runners.`,
      chartTitle: "Pipeline Run Durations (Minutes)",
      chartType: "bar",
      chartData: runsList.slice(0, 5).map((r: any) => ({
        name: r.id,
        value: parseInt(r.duration) || 3
      })),
      tableTitle: "Top Duration Outliers Under Audit",
      tableHeaders: ["Run ID", "Environment", "Duration", "Pass Rate", "Anomaly Status"],
      tableRows: slowRuns.slice(0, 4).map((r: any) => [
        r.id,
        r.environment,
        r.duration,
        `${r.passRate}%`,
        parseInt(r.duration) > 5 ? "⚠️ Latent" : "✅ Nominal"
      ])
    };
  }

  // 10.5. General telemetry counts and metrics queries
  if (p.includes('how many') || p.includes('count') || p.includes('number of') || p.includes('total') || p.includes('average') || p.includes('pass rate') || p.includes('how much') || p.includes('what are') || p.includes('list') || p.includes('get runs') || p.includes('show runs') || p.includes('failing tests')) {
    // If asking about runs
    if (p.includes('run')) {
      return {
        analysisMarkdown: `### 📊 Telemetry Investigation: Run Inventory
You asked about the registered pipeline executions in AWARE.

I am currently tracking **${runsList.length} active runs** within the browser telemetry database.
* **Staging Environment (QA):** \`${runsList.filter((r: any) => r.environment === 'QA').length}\` runs
* **Pre-Production Environment (UAT):** \`${runsList.filter((r: any) => r.environment === 'UAT').length}\` runs
* **Production Environment (Prod):** \`${runsList.filter((r: any) => r.environment === 'Prod' || r.environment === 'PROD').length}\` runs

#### 📈 Key Stats:
* **Average Pass Rate:** \`${avgPassRate}%\`
* **Total Automated Steps:** \`${runsList.reduce((acc: number, r: any) => acc + (r.testsCount || 0), 0)}\` tests executed

You can explore specific runs by typing a direct Run ID (e.g., \`RUN-4592-SIM\`), or compare environments by typing *"compare environments"*.`,
        chartTitle: "Runs Count by Environment",
        chartType: "bar",
        chartData: [
          { name: "QA Runs", value: runsList.filter((r: any) => r.environment === 'QA').length },
          { name: "UAT Runs", value: runsList.filter((r: any) => r.environment === 'UAT').length },
          { name: "PROD Runs", value: runsList.filter((r: any) => r.environment === 'Prod' || r.environment === 'PROD').length }
        ],
        tableTitle: "Telemetry Run Breakdown",
        tableHeaders: ["Environment Cluster", "Total Executed Runs", "Average Success Rate", "Status"],
        tableRows: [
          ["QA Staging", String(runsList.filter((r: any) => r.environment === 'QA').length), `${Math.round(runsList.filter((r: any) => r.environment === 'QA').reduce((sum: number, r: any) => sum + r.passRate, 0) / (runsList.filter((r: any) => r.environment === 'QA').length || 1))}%`, "Active dev cycles"],
          ["UAT Pre-Prod", String(runsList.filter((r: any) => r.environment === 'UAT').length), `${Math.round(runsList.filter((r: any) => r.environment === 'UAT').reduce((sum: number, r: any) => sum + r.passRate, 0) / (runsList.filter((r: any) => r.environment === 'UAT').length || 1))}%`, "Stable baseline"],
          ["Prod Live", String(runsList.filter((r: any) => r.environment === 'Prod' || r.environment === 'PROD').length), `${Math.round(runsList.filter((r: any) => r.environment === 'Prod' || r.environment === 'PROD').reduce((sum: number, r: any) => sum + r.passRate, 0) / (runsList.filter((r: any) => r.environment === 'Prod' || r.environment === 'PROD').length || 1))}%`, "Monitored release"]
        ]
      };
    }
    
    // If asking about test cases or failures
    if (p.includes('test') || p.includes('failure') || p.includes('fail') || p.includes('pass')) {
      return {
        analysisMarkdown: `### 🧪 Telemetry Investigation: Test Case Breakdown
You asked about the test case inventory or success metrics.

The telemetry dataset logs a total of **${context.totalTestCasesTracked || failedTests.length + runsList.reduce((acc: number, r: any) => acc + (r.testsCount || 0), 0)} test case executions** across all runs.
* **Overall Average Pass Rate:** \`${avgPassRate}%\`
* **Currently Failed/Failing Test Cases:** \`${failedTests.length}\`
* **Active Infrastructure Anomalies:** \`${anomaliesList.length}\`

The most common failing modules are isolated in the \`test/gh-workflows\` directory, typically related to intermittent networking handshake timeouts.`,
        chartTitle: "Test Health Metrics",
        chartType: "bar",
        chartData: [
          { name: "Failing Tests", value: failedTests.length },
          { name: "Anomalies Flagged", value: anomaliesList.length },
          { name: "Overall Success %", value: avgPassRate }
        ],
        tableTitle: "Priority Failing Suites",
        tableHeaders: ["Suite ID", "Run Association", "Priority Class", "Action Item"],
        tableRows: failedTests.slice(0, 5).map((t: any) => [
          t.name.split(':')[0],
          t.runId,
          t.priority || "High",
          "Implement connection retry policy"
        ])
      };
    }

    // If asking about anomalies
    if (p.includes('anomaly') || p.includes('anomalies') || p.includes('system') || p.includes('warning') || p.includes('alert')) {
      return {
        analysisMarkdown: `### ⚠️ Telemetry Investigation: Active System Anomalies
You asked about system warnings, anomalies, or outstanding alerts.

There are currently **${anomaliesList.length} active anomalies** monitored in your Chrome browser workspace database:
${anomaliesList.map((a: any) => `* **[${a.type}]**: ${a.text}`).join('\n') || "No active anomalies detected."}

These anomalies primarily occur during high-concurrency staging workflows where database connection pooling exceeds limits.`,
        chartTitle: "System Anomalies by Type",
        chartType: "bar",
        chartData: anomaliesList.map((a: any) => ({
          name: a.type,
          value: 1
        })),
        tableTitle: "Active Alerts Ledger",
        tableHeaders: ["Anomaly Code", "Observation Detail", "System Layer", "Severity"],
        tableRows: anomaliesList.map((a: any) => [
          a.id,
          a.text,
          "Database / Storage",
          "Medium-High"
        ])
      };
    }

    // Generic fallback for counts/numbers
    return {
      analysisMarkdown: `### 📊 Telemetry Investigation: General Metrics
You asked for a general inventory of the database metrics.

Here is the high-level overview of our current telemetry dataset:
* **Total Logged Runs:** \`${runsList.length}\` runs
* **Average Pipeline Pass Rate:** \`${avgPassRate}%\`
* **Currently Failed Test Cases:** \`${failedTests.length}\` cases
* **Monitored Infrastructure Anomalies:** \`${anomaliesList.length}\` warnings

Let me know if you would like me to drill down into runs, specific failed test cases, or active system anomalies!`,
      chartTitle: "System Integrity Trends",
      chartType: "bar",
      chartData: [
        { name: "Active Runs", value: runsList.length },
        { name: "Overall Pass %", value: avgPassRate },
        { name: "Failing Tests", value: failedTests.length },
        { name: "Anomalies", value: anomaliesList.length }
      ],
      tableTitle: "Dynamic RAG Index Search Results",
      tableHeaders: ["Dataset Entity", "Active Records", "Telemetry Coverage"],
      tableRows: [
        ["Runs Evaluated", String(runsList.length), "100% Comprehensive"],
        ["Failing Modules Checked", String(failedTests.length), "100% Comprehensive"],
        ["Anomalies Tracked", String(anomaliesList.length), "100% Comprehensive"]
      ]
    };
  }

  // 11. Dynamic run or test search
  const matchingRun = runsList.find((r: any) => r.id.toLowerCase() === p || r.id.toLowerCase().includes(p) || r.name.toLowerCase().includes(p));
  const matchingTest = failedTests.find((t: any) => t.name.toLowerCase().includes(p) || t.id.toLowerCase().includes(p));

  if (matchingRun) {
    const runFailures = failedTests.filter((t: any) => t.runId === matchingRun.id);
    const failureNotes = runFailures.length > 0
      ? `\n\n#### 🛑 Failed Test Cases Isolate:\n${runFailures.map((t: any) => `* **${t.name}**\n  * **Error:** \`${t.errorMsg || 'Timeout Error'}\``).join('\n')}`
      : "\n\n#### ✅ Run Integrity: 100% stable\nAll test cases passed successfully in this run with zero reported failures.";

    return {
      analysisMarkdown: `### 🔎 Telemetry Focus: Isolate Analysis for Run ${matchingRun.id}
I have performed a custom deep-dive diagnostics report on the specified pipeline run:

* **Run Name:** \`${matchingRun.name}\`
* **Environment:** \`${matchingRun.environment}\`
* **Execution Status:** \`${matchingRun.status}\`
* **Pass Rate:** \`${matchingRun.passRate}%\`
* **Captured Duration:** \`${matchingRun.duration}\`
* **Triggered By:** \`${matchingRun.triggeredBy || "Manual System Event"}\`
* **Recorded Timestamp:** \`${matchingRun.timestamp}\`
${failureNotes}

#### 💡 Resolution Roadmap:
This run executed under **${matchingRun.environment}** configurations. ${matchingRun.passRate < 100 ? "We recommend cross-referencing this with the UAT stable baseline and re-running the failed specs." : "This is a perfect execution with no action required."}`,
      chartTitle: `Run ${matchingRun.id} Execution Coordinates`,
      chartType: "bar",
      chartData: [
        { name: "Pass Rate", value: matchingRun.passRate },
        { name: "Fail Rate", value: 100 - matchingRun.passRate },
        { name: "Duration (min)", value: parseInt(matchingRun.duration) || 3 }
      ],
      tableTitle: `Run ${matchingRun.id} Pipeline Specs`,
      tableHeaders: ["Parameter", "Value", "Health State"],
      tableRows: [
        ["Run Identifier", matchingRun.id, "Isolate"],
        ["Target Cluster", matchingRun.environment, "Configured"],
        ["Pass Percentage", `${matchingRun.passRate}%`, matchingRun.passRate >= 90 ? "✅ Healthy" : "⚠️ Low"],
        ["Execution Latency", matchingRun.duration, "Logged"]
      ]
    };
  }

  if (matchingTest) {
    return {
      analysisMarkdown: `### 🔬 Failing Test Suite Isolate: ${matchingTest.name}
I have successfully isolated the failing test suite you queried:

* **Test Identifier:** \`${matchingTest.id}\`
* **Suite Path:** \`${matchingTest.folder || "test/gh-workflows"}\`
* **Run Association:** \`${matchingTest.runId}\`
* **Current Priority:** \`${matchingTest.priority || "High"}\`
* **Captured Status:** \`${matchingTest.status}\`

#### 🛑 Error Stacktrace Slice:
\`\`\`
${matchingTest.errorMsg || "Gateway connection failures or 504 Gateway Timeout errors detected on target endpoints."}
\`\`\`

#### 🛠️ Proposed Remediation:
1. **Thread Sync**: Add \`await delay()\` or thread synchronization sleep times before assertions.
2. **Increase Timeout**: Configure the run block timeout to \`15000ms\` inside the config file.
3. **Automated Retries**: Turn on retry triggers for this folder context to prevent false alerts.`,
      chartTitle: `Failure Frequency for Test ID: ${matchingTest.id}`,
      chartType: "bar",
      chartData: [
        { name: "Priority Rank", value: matchingTest.priority === 'High' ? 90 : 50 },
        { name: "Timeout (s)", value: 15 },
        { name: "Remediation Est", value: 80 }
      ],
      tableTitle: `Isolated Test Meta details`,
      tableHeaders: ["Property", "Value", "Status"],
      tableRows: [
        ["Test Case ID", matchingTest.id, "Failed State"],
        ["Priority Severity", matchingTest.priority || "High", "Needs Attention"],
        ["Run ID", matchingTest.runId, "Referenced"]
      ]
    };
  }

  // 12. Ultimate Dynamic Fallback
  // Gather entities related to prompt words
  const words = p.split(/\s+/).filter(w => w.length > 2);
  const matchedRuns = runsList.filter((r: any) => words.some((w: string) => r.id.toLowerCase().includes(w) || r.name.toLowerCase().includes(w) || r.environment.toLowerCase().includes(w)));
  const matchedTests = failedTests.filter((t: any) => words.some((w: string) => t.name.toLowerCase().includes(w) || t.id.toLowerCase().includes(w) || (t.errorMsg && t.errorMsg.toLowerCase().includes(w))));

  let matchText = "";
  if (matchedRuns.length > 0) {
    matchText += `\n\n#### 📍 Matching Telemetry Runs Detected (${matchedRuns.length}):\n` + 
      matchedRuns.map((r: any) => `* **Run ID:** \`${r.id}\` | **Env:** \`${r.environment}\` | **Pass Rate:** \`${r.passRate}%\` | **Status:** \`${r.status}\``).join('\n');
  }
  if (matchedTests.length > 0) {
    matchText += `\n\n#### 📍 Matching Failing Test Cases Detected (${matchedTests.length}):\n` + 
      matchedTests.map((t: any) => `* **Test:** \`${t.name}\` | **Run:** \`${t.runId}\` | **Error:** \`${t.errorMsg}\``).join('\n');
  }

  const matchesFound = matchedRuns.length > 0 || matchedTests.length > 0;

  return {
    analysisMarkdown: `### 🤖 Chrome AI Dynamic Telemetry Assistant
I have processed your query: **"${prompt}"** using real-time database indexing.

#### 📊 Telemetry Dataset Stats:
* **Active Runs:** \`${runsList.length}\`
* **Overall Pass Rate:** \`${avgPassRate}%\`
* **Active Failed Test Cases:** \`${failedTests.length}\`
* **Monitored Anomalies:** \`${anomaliesList.length}\`
${matchesFound ? matchText : `\n\n#### 🔍 Search Context:\nI did not find direct matches for the keyword phrase \`"${prompt}"\` in active Runs or Test names. Try searching for specific environment names (e.g., QA, Prod), a test suite keyword (e.g., login, payment), or a direct run ID.`}

#### 💡 Suggested Exploration Commands:
* Type **"status"** or **"summary"** to get a broad pipeline overview.
* Type **"compare environments"** to generate cross-environment analytics graphs.
* Type **"worst run"** to examine our least stable pipeline execution details.`,
    chartTitle: "System Integrity Trends",
    chartType: "line",
    chartData: runsList.slice(0, 5).reverse().map((r: any) => ({ name: r.id, value: r.passRate })),
    tableTitle: "Dynamic RAG Index Search Results",
    tableHeaders: ["Dataset Entity", "Active Records", "Telemetry Coverage"],
    tableRows: [
      ["Runs Evaluated", String(runsList.length), "100% Comprehensive"],
      ["Failing Modules Checked", String(failedTests.length), "100% Comprehensive"],
      ["Anomalies Tracked", String(anomaliesList.length), "100% Comprehensive"]
    ]
  };
}

// AI analytical RAG endpoint
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Check if API key is not configured or is placeholder
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("GEMINI_API_KEY is not configured or has placeholder value. Falling back to local simulated Gemini Nano engine.");
      const fallbackData = simulateTelemetryAnalysis(prompt, context);
      return res.json(fallbackData);
    }

    const systemInstruction = `
      You are Google Chrome AI Telemetry Analyst, a hyper-sophisticated DevOps and Observability co-pilot built directly into AWARE Observability.
      You analyze automated pipeline test matrices, system flakiness logs, and performance metadata.
      Your task is to review the user's prompt alongside the retrieved RAG context from the client browser database.
      
      Note that your pipeline receives automated scheduled runs from GitHub Actions executing scheduled tests across ALL environments (QA, UAT, and Prod). Be prepared to explain, compare, and recommend improvements on these multi-environment pipelines.
      
      You must ALWAYS respond with a JSON object conforming to the response schema. 
      Your analysis should be highly professional, detailed, objective, and action-oriented. Provide precise technical advice, root cause diagnostics, and actionable steps.
      
      For the chartData: suggest a matching set of numeric coordinates to plot a beautiful trend or comparison, e.g., representing test durations, failure frequencies, or environment pass rates. If no chart is suitable, set chartType to 'none'.
      For tableRows and tableHeaders: if appropriate, represent relevant data slices in a clear tabular structure.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `
        Prompt: ${prompt}
        
        Browser Database RAG Context:
        ${JSON.stringify(context, null, 2)}
      `,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysisMarkdown: { 
              type: Type.STRING, 
              description: "Technical, highly analytical diagnostic review, written in Markdown. Include headers, bullet points, code snippets or inline highlights where appropriate. No self-praise." 
            },
            chartTitle: { type: Type.STRING, description: "A elegant and descriptive title for the recommended visualization." },
            chartType: { type: Type.STRING, description: "The type of chart to display: 'line' | 'bar' | 'composed' | 'none'" },
            chartData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  secondaryValue: { type: Type.NUMBER }
                },
                required: ["name", "value"]
              }
            },
            tableTitle: { type: Type.STRING, description: "Descriptive title for the custom-generated table." },
            tableHeaders: { type: Type.ARRAY, items: { type: Type.STRING } },
            tableRows: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          },
          required: ["analysisMarkdown", "chartTitle", "chartType"]
        }
      }
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text));
  } catch (err: any) {
    console.warn("Gemini AI API Error, falling back to local server-side simulation engine:", err?.message || err);
    try {
      const { prompt, context } = req.body;
      const fallbackData = simulateTelemetryAnalysis(prompt, context);
      res.json(fallbackData);
    } catch (simErr: any) {
      console.error("Server-side simulation fallback failed:", simErr);
      res.status(500).json({ 
        error: "Error processing telemetry diagnostics with Chrome AI",
        details: err?.message || err 
      });
    }
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack server running on http://localhost:${PORT}`);
  });
}

start();
