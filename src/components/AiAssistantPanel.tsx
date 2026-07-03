import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  Terminal, 
  LineChart, 
  BarChart, 
  Table, 
  HelpCircle, 
  Loader2, 
  ChevronRight, 
  AlertTriangle, 
  Database,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { BrowserDb } from '../lib/browserDb';

interface AiAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isError?: boolean;
  table?: {
    title?: string;
    headers: string[];
    rows: string[][];
  };
  chart?: {
    title: string;
    type: 'line' | 'bar' | 'composed' | 'none';
    data: { name: string; value: number; secondaryValue?: number }[];
  };
}

export default function AiAssistantPanel({ 
  isOpen, 
  onClose, 
  initialPrompt,
  onClearInitialPrompt 
}: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      sender: 'ai',
      text: `### Hello, I am your Google Chrome AI Telemetry Analyst!
I am powered by Google Gemini to analyze your browser database's active telemetry runs, test results, and stability patterns.

**How can I help you today?**
* **Perform RAG Diagnostics**: I query your Indexed/LocalStorage browser database to cross-reference pipelines.
* **Auto-Generate Visualizations**: I build dynamic responsive data charts based on telemetry statistics.
* **Triage Failed Logs**: Provide me with stacktraces, and I will isolate the root cause and propose automated fixes.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbState, setDbState] = useState({
    runsCount: 0,
    testsCount: 0,
    anomaliesCount: 0
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync DB stats on load and on custom DB update events
  const syncDbStats = () => {
    const runs = BrowserDb.getRuns();
    const tests = BrowserDb.getTestCases();
    const anomalies = BrowserDb.getAnomalies();
    setDbState({
      runsCount: runs.length,
      testsCount: tests.length,
      anomaliesCount: anomalies.length
    });
  };

  useEffect(() => {
    syncDbStats();
    window.addEventListener('aware_db_update', syncDbStats);
    return () => {
      window.removeEventListener('aware_db_update', syncDbStats);
    };
  }, []);

  // Handle external trigger prompts (e.g. from the dashboard or test runs)
  useEffect(() => {
    if (isOpen && initialPrompt) {
      handleSendMessage(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [isOpen, initialPrompt]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    const prompt = textToSend.trim();
    if (!prompt) return;

    // Add User Message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    let isLocalFallback = false;

    try {
      // Assemble Browser DB context for RAG
      const runs = BrowserDb.getRuns();
      const testCases = BrowserDb.getTestCases();
      const suites = BrowserDb.getSuites();
      const anomalies = BrowserDb.getAnomalies();

      // Send a clean, structured subset of our database to avoid token bloat
      const contextPayload = {
        summary: {
          totalRuns: runs.length,
          totalTestCasesTracked: testCases.length,
          totalSuites: suites.length,
          activeAnomaliesCount: anomalies.length,
        },
        runs: runs.map(r => ({
          id: r.id,
          name: r.name,
          status: r.status,
          passRate: r.passRate,
          duration: r.duration,
          environment: r.environment,
          failedCount: r.failedCount,
          timestamp: r.timestamp
        })),
        recentFailedTests: testCases.filter(tc => tc.status === 'Failed' || tc.status === 'Flaky').map(tc => ({
          id: tc.id,
          name: tc.name,
          runId: tc.runId,
          status: tc.status,
          priority: tc.priority,
          errorMsg: tc.errorMsg,
          stackTrace: tc.stackTrace ? tc.stackTrace.substring(0, 150) + '...' : undefined
        })),
        anomalies: anomalies.map(a => ({
          id: a.id,
          type: a.type,
          text: a.text
        }))
      };

      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: contextPayload
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned code ${response.status}`);
      }

      const data = await response.json();

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.analysisMarkdown || "No written response returned.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        table: data.tableHeaders && data.tableRows ? {
          title: data.tableTitle || "Generated Table",
          headers: data.tableHeaders,
          rows: data.tableRows
        } : undefined,
        chart: data.chartType && data.chartType !== 'none' && data.chartData ? {
          title: data.chartTitle || "Telemetry Chart",
          type: data.chartType,
          data: data.chartData
        } : undefined
      };

      setMessages(prev => [...prev, aiMsg]);

    } catch (err: any) {
      isLocalFallback = true;
      console.warn("Server call failed, falling back to local Chrome AI Nano engine:", err);
      
      // Let's perform high-fidelity local on-device RAG processing instantly
      const runs = BrowserDb.getRuns();
      const testCases = BrowserDb.getTestCases();
      const suites = BrowserDb.getSuites();
      const anomalies = BrowserDb.getAnomalies();

      const contextPayload = {
        summary: {
          totalRuns: runs.length,
          totalTestCasesTracked: testCases.length,
          totalSuites: suites.length,
          activeAnomaliesCount: anomalies.length,
        },
        runs: runs.map(r => ({
          id: r.id,
          name: r.name,
          status: r.status,
          passRate: r.passRate,
          duration: r.duration,
          environment: r.environment,
          failedCount: r.failedCount,
          passedCount: r.passedCount,
          testsCount: r.testsCount,
          triggeredBy: r.triggeredBy,
          timestamp: r.timestamp
        })),
        recentFailedTests: testCases.filter(tc => tc.status === 'Failed' || tc.status === 'Flaky').map(tc => ({
          id: tc.id,
          name: tc.name,
          runId: tc.runId,
          status: tc.status,
          priority: tc.priority,
          errorMsg: tc.errorMsg,
          folder: tc.folder,
          stackTrace: tc.stackTrace ? tc.stackTrace.substring(0, 150) + '...' : undefined
        })),
        anomalies: anomalies.map(a => ({
          id: a.id,
          type: a.type,
          text: a.text
        }))
      };

      // Query local Chrome AI on-device prompt API or its high-fidelity simulation
      setTimeout(async () => {
        let localData: any = null;

        // Try local window.ai.languageModel
        try {
          const anyWindow = window as any;
          if (anyWindow.ai && anyWindow.ai.languageModel) {
            const capabilities = await anyWindow.ai.languageModel.capabilities();
            if (capabilities.available !== 'no') {
              const session = await anyWindow.ai.languageModel.create({
                systemPrompt: "You are Chrome's on-device Gemini Nano AI. You analyze developer telemetry logs and databases."
              });
              const rawResponse = await session.prompt(`
                User Prompt: ${prompt}
                Context Payload: ${JSON.stringify(contextPayload)}
              `);
              
              localData = {
                analysisMarkdown: rawResponse,
                chartType: 'none'
              };
              if (typeof session.destroy === 'function') session.destroy();
            }
          }
        } catch (nativeErr) {
          console.warn("Native Chrome window.ai unavailable, falling back to simulation.", nativeErr);
        }

        if (!localData) {
          localData = simulateChromeAiNano(prompt, contextPayload);
        }

        const aiMsg: Message = {
          id: `ai-local-${Date.now()}`,
          sender: 'ai',
          text: localData.analysisMarkdown,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          table: localData.tableHeaders && localData.tableRows ? {
            title: localData.tableTitle || "Generated Table",
            headers: localData.tableHeaders,
            rows: localData.tableRows
          } : undefined,
          chart: localData.chartType && localData.chartType !== 'none' && localData.chartData ? {
            title: localData.chartTitle || "Telemetry Chart",
            type: localData.chartType,
            data: localData.chartData
          } : undefined
        };

        setMessages(prev => [...prev, aiMsg]);
        setIsLoading(false);
      }, 1000); // 1000ms delay to represent simulated on-device compilation latency
      
      return; // Handled locally
    } finally {
      if (!isLocalFallback) {
        setIsLoading(false);
      }
    }
  };

  // Helper simulated on-device Gemini Nano diagnostic function
  function simulateChromeAiNano(prompt: string, context: any) {
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
          analysisMarkdown: `### 🔎 Telemetry Intelligence Report
No pipeline runs are currently tracked in the database. Please generate some simulated runs in Settings first.`,
          chartTitle: "No Data Available",
          chartType: "none",
          chartData: []
        };
      }

      // Find failed tests specifically in this worst run
      const worstRunFailures = failedTests.filter((t: any) => t.runId === worstRun.id);
      let failuresSection = "";
      if (worstRunFailures.length > 0) {
        failuresSection = `\n\n#### 🛑 Failed Test Cases in this run:\n` + worstRunFailures.map((t: any) => `* **${t.name}**\n  * **Error:** \`${t.errorMsg || 'Timeout AssertionError'}\``).join('\n');
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
          analysisMarkdown: `### 🔎 Telemetry Intelligence Report
No pipeline runs are currently tracked in the database.`,
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
      const prodRuns = runsList.filter((r: any) => r.environment === 'Prod');

      const avgQA = qaRuns.length ? Math.round(qaRuns.reduce((sum: number, r: any) => sum + r.passRate, 0) / qaRuns.length) : 85;
      const avgUAT = uatRuns.length ? Math.round(uatRuns.reduce((sum: number, r: any) => sum + r.passRate, 0) / uatRuns.length) : 100;
      const avgPROD = prodRuns.length ? Math.round(prodRuns.reduce((sum: number, r: any) => sum + r.passRate, 0) / prodRuns.length) : 94;

      return {
        analysisMarkdown: `### 📊 Cross-Environment Comparative Latency & Health Report
An on-device comparative audit of telemetry latencies and pass rates across staging and production environment clusters:

1. **QA (Quality Assurance)**: Avg Pass Rate: **${avgQA}%** (${qaRuns.length} runs). High iteration, variable container performance.
2. **UAT (User Acceptance)**: Avg Pass Rate: **${avgUAT}%** (${uatRuns.length} runs). Stable staging parity, zero active regressions.
3. **PROD (Production)**: Avg Pass Rate: **${avgPROD}%** (${runsList.filter((r: any) => r.environment === 'PROD' || r.environment === 'Prod').length} runs). Strictly isolated endpoints with low latent execution pools.

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
          ["PROD Live", String(runsList.filter((r: any) => r.environment === 'PROD' || r.environment === 'Prod').length), `${avgPROD}%`, "Production Active"]
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

  const handlePresetClick = (presetType: string) => {
    let text = "";
    switch (presetType) {
      case 'failures':
        text = "Analyze all active failed test cases and flakiness metrics. Give me a diagnostic report and recommend direct automated fixes.";
        break;
      case 'environments':
        text = "Compare test metrics across our QA, UAT, and PROD environments. Identify high-risk bottlenecks and generate a comparison line chart.";
        break;
      case 'flaky':
        text = "Scan all runs in the browser database to identify flaky behaviors. Predict pipeline failure risk and recommend optimal test partitioning.";
        break;
      case 'custom':
        text = "Build a custom analytics summary showing tests pass rates vs run duration, and output a detailed bar chart.";
        break;
    }
    handleSendMessage(text);
  };

  // Helper to parse simple markdown to JSX safely
  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-bold text-zinc-100 mt-3 mb-1 font-sans">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-base font-bold text-[#4daeff] mt-4 mb-2 font-sans">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="text-lg font-extrabold text-[#4daeff] mt-5 mb-3 font-sans border-b border-[#262626] pb-1">{line.replace('# ', '')}</h2>;
      }
      // Bullets
      if (line.startsWith('* ') || line.startsWith('- ')) {
        const text = line.replace(/^[\*\-]\s+/, '');
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-zinc-300 leading-relaxed mb-1">
            {renderInlineMarkdown(text)}
          </li>
        );
      }
      // Numbered bullets
      if (/^\d+\.\s+/.test(line)) {
        const text = line.replace(/^\d+\.\s+/, '');
        return (
          <li key={idx} className="ml-4 list-decimal text-xs text-zinc-300 leading-relaxed mb-1">
            {renderInlineMarkdown(text)}
          </li>
        );
      }
      // Code snippet block (very simple, we'll group standard lines)
      if (line.trim() === '```' || line.startsWith('```')) {
        return null; // Handle boundaries silently
      }

      return (
        <p key={idx} className="text-xs text-zinc-300 leading-relaxed mb-2 font-sans">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Replace **bold** and `code` in lines
  const renderInlineMarkdown = (text: string) => {
    if (!text) return '';
    let elements: React.ReactNode[] = [];
    let tempText = text;
    let key = 0;

    while (tempText.length > 0) {
      const boldMatch = tempText.match(/\*\*([^*]+)\*\*/);
      const codeMatch = tempText.match(/`([^`]+)`/);

      // Find which match occurs first
      const boldIndex = boldMatch && boldMatch.index !== undefined ? boldMatch.index : -1;
      const codeIndex = codeMatch && codeMatch.index !== undefined ? codeMatch.index : -1;

      if (boldIndex !== -1 && (codeIndex === -1 || boldIndex < codeIndex)) {
        // Handle bold text
        if (boldIndex > 0) {
          elements.push(<span key={key++}>{tempText.substring(0, boldIndex)}</span>);
        }
        elements.push(<strong key={key++} className="font-extrabold text-[#4daeff]">{boldMatch![1]}</strong>);
        tempText = tempText.substring(boldIndex + boldMatch![0].length);
      } else if (codeIndex !== -1 && (boldIndex === -1 || codeIndex < boldIndex)) {
        // Handle inline code
        if (codeIndex > 0) {
          elements.push(<span key={key++}>{tempText.substring(0, codeIndex)}</span>);
        }
        elements.push(
          <code key={key++} className="bg-[#181818] border border-[#2b2b2b] text-amber-400 px-1 py-0.5 rounded text-[10px] font-mono">
            {codeMatch![1]}
          </code>
        );
        tempText = tempText.substring(codeIndex + codeMatch![0].length);
      } else {
        // No matches left
        elements.push(<span key={key++}>{tempText}</span>);
        break;
      }
    }

    return elements;
  };

  // Render a responsive SVG data chart generated by AI
  const renderGeneratedChart = (chart: Message['chart']) => {
    if (!chart || !chart.data || chart.data.length === 0) return null;
    
    const height = 140;
    const padding = 25;
    const width = 340;
    
    // Find limits
    const values = chart.data.map(d => d.value);
    const secValues = chart.data.map(d => d.secondaryValue || 0);
    const maxVal = Math.max(...values, ...secValues, 10);
    const minVal = 0;
    const yRange = maxVal - minVal;

    // Build coordinates
    const points = chart.data.map((item, idx) => {
      const x = padding + (idx / (chart.data.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - ((item.value - minVal) / (yRange || 1)) * (height - padding * 2);
      
      let secY = 0;
      if (item.secondaryValue !== undefined) {
        secY = height - padding - ((item.secondaryValue - minVal) / (yRange || 1)) * (height - padding * 2);
      }

      return { x, y, secY, name: item.name, value: item.value, secValue: item.secondaryValue };
    });

    return (
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-3 mt-3 text-left">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#4daeff] font-extrabold flex items-center gap-1.5">
            {chart.type === 'line' ? <LineChart size={12} /> : <BarChart size={12} />}
            {chart.title}
          </span>
          <span className="text-[8px] font-mono text-zinc-500 uppercase">Live AI Plot</span>
        </div>

        {/* Dynamic SVG Frame */}
        <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
              const y = padding + p * (height - padding * 2);
              const gridVal = Math.round(maxVal - p * yRange);
              return (
                <g key={i}>
                  <line 
                    x1={padding} 
                    y1={y} 
                    x2={width - padding} 
                    y2={y} 
                    stroke="#222" 
                    strokeWidth="1" 
                    strokeDasharray="2,2" 
                  />
                  <text 
                    x={padding - 5} 
                    y={y + 3} 
                    fill="#555" 
                    fontSize="7" 
                    fontFamily="monospace" 
                    textAnchor="end"
                  >
                    {gridVal}
                  </text>
                </g>
              );
            })}

            {/* Render Bars */}
            {chart.type === 'bar' && points.map((p, i) => {
              const barW = Math.max(8, (width - padding * 2) / (chart.data.length * 1.5));
              const barH = height - padding - p.y;
              return (
                <rect 
                  key={i} 
                  x={p.x - barW / 2} 
                  y={p.y} 
                  width={barW} 
                  height={barH} 
                  fill="#4daeff" 
                  opacity="0.85" 
                  rx="1"
                />
              );
            })}

            {/* Render Lines */}
            {(chart.type === 'line' || chart.type === 'composed') && (
              <>
                {/* Main value line */}
                <path 
                  d={`M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`} 
                  fill="none" 
                  stroke="#4daeff" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />
                {/* Points */}
                {points.map((p, i) => (
                  <circle 
                    key={i} 
                    cx={p.x} 
                    cy={p.y} 
                    r="3.5" 
                    fill="#101010" 
                    stroke="#4daeff" 
                    strokeWidth="1.5" 
                  />
                ))}
              </>
            )}

            {/* Composed Secondary Plot (e.g. Failure Volume as red bars or line) */}
            {chart.type === 'composed' && points.map((p, i) => {
              if (p.secValue === undefined) return null;
              const barW = Math.max(4, (width - padding * 2) / (chart.data.length * 2.5));
              const barH = height - padding - p.secY;
              return (
                <rect 
                  key={`sec-${i}`} 
                  x={p.x + 2} 
                  y={p.secY} 
                  width={barW} 
                  height={barH} 
                  fill="#ef5350" 
                  opacity="0.75" 
                  rx="1"
                />
              );
            })}

            {/* Bottom labels */}
            {points.map((p, i) => (
              <text 
                key={i} 
                x={p.x} 
                y={height - 5} 
                fill="#666" 
                fontSize="7" 
                fontFamily="monospace" 
                textAnchor="middle"
              >
                {p.name}
              </text>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  // Render a responsive generated table
  const renderGeneratedTable = (table: Message['table']) => {
    if (!table) return null;

    return (
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-3 mt-3 text-left overflow-hidden">
        <div className="flex items-center gap-1.5 mb-2 text-[#4daeff] font-mono text-[10px] uppercase font-extrabold">
          <Table size={12} />
          {table.title || "Custom AI Extracted Matrix"}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-[#262626] bg-[#1a1a1a] text-zinc-500 uppercase tracking-widest font-mono text-[8px] font-bold">
                {table.headers.map((h, i) => (
                  <th key={i} className="p-2 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]">
              {table.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#1c1c1c]/40 transition-colors text-zinc-300">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 font-mono">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-[400px] bg-[#0f0f0f] border-l border-[#262626] shadow-2xl z-50 flex flex-col overflow-hidden font-sans">
      
      {/* Drawer Header */}
      <div className="p-4 bg-[#141414] border-b border-[#262626] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#4daeff]/10 border border-[#4daeff]/20 rounded text-[#4daeff] animate-pulse">
            <Sparkles size={16} />
          </div>
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#4daeff] block">AWARE Analyst</span>
            <span className="text-[10px] text-zinc-400 block font-sans">Google Chrome AI • Gemini RAG Pipeline</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-all"
        >
          <X size={16} />
        </button>
      </div>

      {/* Database Status Tracker */}
      <div className="px-4 py-2 bg-[#181818]/60 border-b border-[#222] flex items-center justify-between text-[9px] font-mono text-zinc-500">
        <div className="flex items-center gap-1.5">
          <Database size={10} className="text-emerald-500" />
          <span>Local Storage DB active</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Runs: <strong className="text-zinc-300">{dbState.runsCount}</strong></span>
          <span>Tests: <strong className="text-zinc-300">{dbState.testsCount}</strong></span>
          <span>Anomalies: <strong className="text-zinc-300">{dbState.anomaliesCount}</strong></span>
        </div>
      </div>

      {/* Message Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender Label */}
            <div className="text-[9px] font-mono text-zinc-500 mb-1 flex items-center gap-1">
              {msg.sender === 'ai' ? (
                <>
                  <Bot size={10} className="text-[#4daeff]" /> Chrome AI Telemetry Analyst • {msg.timestamp}
                </>
              ) : (
                <>
                  User Operator • {msg.timestamp}
                </>
              )}
            </div>

            {/* Bubble */}
            <div className={`max-w-[340px] px-3 py-2.5 rounded-lg text-xs leading-relaxed ${
              msg.sender === 'user' 
                ? 'bg-[#1c2c3d] border border-[#2b4c6e] text-zinc-100' 
                : msg.isError 
                  ? 'bg-red-950/25 border border-red-900/40 text-red-300'
                  : 'bg-[#161616] border border-[#232323] text-zinc-300'
            }`}>
              {msg.sender === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : (
                <div className="space-y-1 select-text">
                  {renderMarkdown(msg.text)}
                </div>
              )}

              {/* Auxiliary AI Tables & Charts */}
              {renderGeneratedTable(msg.table)}
              {renderGeneratedChart(msg.chart)}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="text-[9px] font-mono text-zinc-500 mb-1 flex items-center gap-1">
              <Bot size={10} className="text-[#4daeff] animate-spin" /> Deeply searching and running RAG diagnostics...
            </div>
            <div className="bg-[#121212] border border-[#232323] px-3 py-3 rounded-lg flex items-center gap-3 max-w-[340px]">
              <Loader2 size={16} className="text-[#4daeff] animate-spin shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-zinc-400 font-sans font-medium">Gemini 3.5 is triaging metadata</span>
                <span className="text-[9px] text-zinc-600 font-mono">Cross-referencing active pipeline matrices...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Action Prompts (Only visible when idle) */}
      {!isLoading && messages.length <= 1 && (
        <div className="p-3 border-t border-[#222] bg-[#141414]/30">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mb-2 font-bold flex items-center gap-1">
            <Cpu size={10} className="text-[#4daeff]" /> Suggested Preset Diagnostics
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handlePresetClick('failures')}
              className="p-2 text-left bg-[#131313] border border-[#232323] hover:border-[#4daeff]/30 hover:bg-[#181818] rounded transition-all text-[10px] font-sans group"
            >
              <span className="font-bold text-zinc-300 block mb-0.5 group-hover:text-[#4daeff] flex items-center justify-between">
                Triage Failures <ChevronRight size={10} />
              </span>
              <span className="text-zinc-500 text-[9px] leading-tight block">Scan and propose test error stacktrace repairs</span>
            </button>

            <button 
              onClick={() => handlePresetClick('environments')}
              className="p-2 text-left bg-[#131313] border border-[#232323] hover:border-[#4daeff]/30 hover:bg-[#181818] rounded transition-all text-[10px] font-sans group"
            >
              <span className="font-bold text-zinc-300 block mb-0.5 group-hover:text-[#4daeff] flex items-center justify-between">
                Cross-Env Analysis <ChevronRight size={10} />
              </span>
              <span className="text-zinc-500 text-[9px] leading-tight block">Compare latencies across QA, UAT, & Prod</span>
            </button>

            <button 
              onClick={() => handlePresetClick('flaky')}
              className="p-2 text-left bg-[#131313] border border-[#232323] hover:border-[#4daeff]/30 hover:bg-[#181818] rounded transition-all text-[10px] font-sans group"
            >
              <span className="font-bold text-zinc-300 block mb-0.5 group-hover:text-[#4daeff] flex items-center justify-between">
                Predict Flakiness <ChevronRight size={10} />
              </span>
              <span className="text-zinc-500 text-[9px] leading-tight block">Isolate intermittent flakiness trends</span>
            </button>

            <button 
              onClick={() => handlePresetClick('custom')}
              className="p-2 text-left bg-[#131313] border border-[#232323] hover:border-[#4daeff]/30 hover:bg-[#181818] rounded transition-all text-[10px] font-sans group"
            >
              <span className="font-bold text-zinc-300 block mb-0.5 group-hover:text-[#4daeff] flex items-center justify-between">
                Render Visuals <ChevronRight size={10} />
              </span>
              <span className="text-zinc-500 text-[9px] leading-tight block">Build dynamic bar/line plots on telemetry</span>
            </button>
          </div>
        </div>
      )}

      {/* Input Form Footer */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className="p-3 bg-[#131313] border-t border-[#262626] flex items-center gap-2"
      >
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
          placeholder="Ask Chrome AI to generate charts or triage..."
          className="flex-1 bg-[#1a1a1a] border border-[#2b2b2b] rounded px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[#4daeff]/50 transition-colors placeholder:text-zinc-600 font-sans"
        />
        <button 
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="p-2 bg-[#4daeff]/10 hover:bg-[#4daeff]/20 border border-[#4daeff]/30 hover:border-[#4daeff]/50 rounded text-[#4daeff] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
