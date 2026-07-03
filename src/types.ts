export interface Run {
  id: string;
  name: string;
  branch: string;
  status: 'Passed' | 'Failed' | 'Flaky' | 'Running';
  environment: 'Prod' | 'UAT' | 'QA';
  duration: string;
  timestamp: string;
  passRate: number;
  triggeredBy: string;
  commit: string;
  testsCount: number;
  passedCount: number;
  skippedCount: number;
  failedCount: number;
  suite: 'Smoke' | 'Security' | 'Regression' | 'Performance';
  hasMemoryAnomaly?: boolean;
}

export interface TestCase {
  id: string;
  name: string;
  suiteId: string;
  runId: string;
  folder: string;
  status: 'Passed' | 'Failed' | 'Flaky' | 'Skipped';
  duration: string;
  tag: string;
  priority: 'P0 - Critical' | 'P1 - High' | 'P2 - Medium';
  errorMsg?: string;
  stackTrace?: string;
  diff?: {
    expected: string;
    actual: string;
  };
  history?: {
    runId: string;
    status: 'Passed' | 'Failed' | 'Flaky';
    duration: string;
    timestamp: string;
  }[];
}

export interface Suite {
  id: string;
  name: string;
  totalTests: number;
  duration: string;
  stability30d: number;
  environment: 'Production' | 'Staging' | 'UAT' | 'QA';
  category: 'Smoke' | 'Regression' | 'Security';
  heatmapHistory: ('Passed' | 'Failed' | 'Flaky' | 'Skipped')[];
}

export type TabType = 'Dashboard' | 'Runs' | 'Tests' | 'Suites' | 'Comparison' | 'Analytics' | 'Settings';
