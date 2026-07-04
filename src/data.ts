import { Run, TestCase, Suite } from './types';

export const initialRuns: Run[] = [
  {
    id: 'RUN-9482-sec',
    name: 'Security_Core_Auth_Suite',
    branch: 'feat/oauth-v2',
    status: 'Passed',
    environment: 'UAT',
    duration: '12m 45s',
    timestamp: '2 mins ago',
    passRate: 98.5,
    triggeredBy: 'CI/CD Bot',
    commit: 'feat/oauth-v2',
    testsCount: 1222,
    passedCount: 1204,
    skippedCount: 18,
    failedCount: 0,
    suite: 'Security',
    hasMemoryAnomaly: false,
  },
  {
    id: 'RUN-8492-AX',
    name: 'Regression_Payment_Gateway_V2',
    branch: 'main • feat/auth-refactor',
    status: 'Failed',
    environment: 'Prod',
    duration: '4m 12s',
    timestamp: 'Just now',
    passRate: 82.1,
    triggeredBy: 'ci-bot',
    commit: 'a1b2c3d',
    testsCount: 1405,
    passedCount: 1402,
    skippedCount: 0,
    failedCount: 3,
    suite: 'Regression',
    hasMemoryAnomaly: true,
  },
  {
    id: 'RUN-9480-smk',
    name: 'Smoke_Frontend_Navigation',
    branch: 'fix/api-latency',
    status: 'Flaky',
    environment: 'QA',
    duration: '3m 20s',
    timestamp: '1 hr ago',
    passRate: 95.0,
    triggeredBy: 'Alex Chen',
    commit: 'e5f6g7h',
    testsCount: 200,
    passedCount: 190,
    skippedCount: 5,
    failedCount: 5,
    suite: 'Smoke',
    hasMemoryAnomaly: false,
  },
  {
    id: 'RUN-9479-sec',
    name: 'Security_Data_Sanitization',
    branch: 'main',
    status: 'Passed',
    environment: 'UAT',
    duration: '8m 05s',
    timestamp: '2 hrs ago',
    passRate: 100,
    triggeredBy: 'CI/CD Bot',
    commit: 'b1c2d3e',
    testsCount: 500,
    passedCount: 500,
    skippedCount: 0,
    failedCount: 0,
    suite: 'Security',
    hasMemoryAnomaly: false,
  },
  {
    id: 'RUN-8491-BZ',
    name: 'API_Latency_Sanity',
    branch: 'main • fix/api-latency',
    status: 'Passed',
    environment: 'Prod',
    duration: '12m 45s',
    timestamp: '15m ago',
    passRate: 100,
    triggeredBy: 'ci-bot',
    commit: 'f5e6d7c',
    testsCount: 845,
    passedCount: 845,
    skippedCount: 0,
    failedCount: 0,
    suite: 'Performance',
    hasMemoryAnomaly: false,
  }
];

export const initialTestCases: TestCase[] = [
  {
    id: 'verify_user_authentication',
    name: 'auth.service.spec.ts: Login Flow',
    suiteId: 'prd-smk-01',
    runId: 'RUN-8492-AX',
    folder: 'src/services/auth',
    status: 'Failed',
    duration: '1.2s',
    tag: 'auth',
    priority: 'P0 - Critical',
    errorMsg: 'AssertionError: expected { Object (id, email, ...) } to deeply equal { Object (id, email, token, ...) }',
    stackTrace: `at Context.<anonymous> (src/services/auth/auth.service.spec.ts:145:32)\nat processTicksAndRejections (node:internal/process/task_queues:96:5)`,
    diff: {
      expected: '{\n  "id": "usr_12345",\n  "email": "test@example.com",\n  "status": "pending"\n}',
      actual: '{\n  "id": "usr_12345",\n  "email": "test@example.com",\n  "status": "active",\n  "token": "ey..."\n}'
    },
    history: [
      { runId: 'RUN-9482-sec', status: 'Passed', duration: '1.1s', timestamp: '2 mins ago' },
      { runId: 'RUN-9480-smk', status: 'Passed', duration: '1.2s', timestamp: '1 hr ago' },
      { runId: 'RUN-9479-sec', status: 'Passed', duration: '1.0s', timestamp: '2 hrs ago' },
      { runId: 'RUN-8491-BZ', status: 'Passed', duration: '1.1s', timestamp: '15m ago' },
    ]
  },
  {
    id: 'load_dashboard_widgets',
    name: 'load_dashboard_widgets',
    suiteId: 'prd-smk-01',
    runId: 'RUN-8492-AX',
    folder: 'src/components/dashboard',
    status: 'Passed',
    duration: '0.8s',
    tag: 'ui',
    priority: 'P1 - High',
    history: [
      { runId: 'RUN-9482-sec', status: 'Passed', duration: '0.7s', timestamp: '2 mins ago' },
      { runId: 'RUN-9480-smk', status: 'Passed', duration: '0.8s', timestamp: '1 hr ago' },
    ]
  },
  {
    id: 'fetch_user_profile_data',
    name: 'fetch_user_profile_data',
    suiteId: 'prd-smk-01',
    runId: 'RUN-8492-AX',
    folder: 'src/services/auth',
    status: 'Passed',
    duration: '0.4s',
    tag: 'api',
    priority: 'P2 - Medium',
    history: [
      { runId: 'RUN-9482-sec', status: 'Passed', duration: '0.4s', timestamp: '2 mins ago' },
    ]
  },
  {
    id: 'submit_checkout_form',
    name: 'submit_checkout_form',
    suiteId: 'prd-smk-01',
    runId: 'RUN-8492-AX',
    folder: 'test/e2e/flows',
    status: 'Flaky',
    duration: '5.1s',
    tag: 'e2e',
    priority: 'P1 - High',
    errorMsg: 'TimeoutError: Element not interactable after 5s',
    stackTrace: 'at Page.click (src/e2e/checkout/checkout_stripe.spec.ts:89:12)',
    history: [
      { runId: 'RUN-9482-sec', status: 'Passed', duration: '4.2s', timestamp: '2 mins ago' },
      { runId: 'RUN-9480-smk', status: 'Failed', duration: '5.1s', timestamp: '1 hr ago' },
    ]
  },
  {
    id: 'user_controller_profile',
    name: 'user.controller.spec.ts: GET /profile',
    suiteId: 'prd-smk-01',
    runId: 'RUN-8492-AX',
    folder: 'src/controllers',
    status: 'Flaky',
    duration: '450ms',
    tag: 'api',
    priority: 'P2 - Medium',
    history: [
      { runId: 'RUN-9482-sec', status: 'Passed', duration: '350ms', timestamp: '2 mins ago' },
    ]
  },
  {
    id: 'payment_gateway_success',
    name: 'payment.gateway.e2e.ts: Checkout Success',
    suiteId: 'prd-smk-01',
    runId: 'RUN-8492-AX',
    folder: 'test/e2e/flows',
    status: 'Passed',
    duration: '4.2s',
    tag: 'e2e',
    priority: 'P0 - Critical',
    history: [
      { runId: 'RUN-9482-sec', status: 'Passed', duration: '4.1s', timestamp: '2 mins ago' },
    ]
  }
];

export const initialSuites: Suite[] = [
  {
    id: 'prd-smk-01',
    name: 'Prod Critical Smoke',
    totalTests: 142,
    duration: '4m 12s',
    stability30d: 86,
    environment: 'Production',
    category: 'Smoke',
    heatmapHistory: ['Passed', 'Passed', 'Passed', 'Passed', 'Failed', 'Passed', 'Passed', 'Passed', 'Passed', 'Flaky', 'Passed', 'Passed', 'Failed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Failed', 'Failed']
  },
  {
    id: 'api-reg-core',
    name: 'Core API Regression',
    totalTests: 1204,
    duration: '18m 45s',
    stability30d: 100,
    environment: 'QA',
    category: 'Regression',
    heatmapHistory: ['Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed', 'Passed']
  },
  {
    id: 'ui-e2e-chk',
    name: 'UI E2E - Checkout',
    totalTests: 45,
    duration: '8m 10s',
    stability30d: 92,
    environment: 'UAT',
    category: 'Regression',
    heatmapHistory: ['Passed', 'Passed', 'Flaky', 'Passed', 'Passed', 'Failed', 'Passed', 'Passed', 'Flaky', 'Passed', 'Passed', 'Flaky', 'Passed', 'Passed', 'Passed', 'Passed', 'Flaky', 'Passed', 'Passed', 'Flaky']
  }
];

export const activeAnomalies = [
  {
    id: 'AuthService.testTokenRefresh',
    type: 'FLAKY',
    text: 'Failed 3 of last 5 runs (Timeout).',
    badgeStyle: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  },
  {
    id: 'CheckoutFlow.testPaymentGateway',
    type: 'FAILING',
    text: 'Consistent 500 error since deploy #842.',
    badgeStyle: 'bg-red-500/10 text-red-400 border border-red-500/20'
  },
  {
    id: 'ImageUpload.testLargeFile',
    type: 'DEGRADED',
    text: 'Duration increased by 400% (avg 8.2s).',
    badgeStyle: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  }
];

export const activeAnomaliesStream = [
  {
    id: 'TR-9824-A',
    type: 'ERR_TIMEOUT',
    name: 'billing_api / charge_customer',
    detail: 'p99 > 1200ms',
    time: '2m ago',
    colorClass: 'text-red-400 border border-red-500/30 bg-red-500/10'
  },
  {
    id: 'TR-9823-X',
    type: 'FLAKY',
    name: 'auth_service / validate_token',
    detail: 'Pass rate drops to 85%',
    time: '14m ago',
    colorClass: 'text-amber-400 border border-amber-500/30 bg-amber-500/10'
  }
];

export const trendPoints = [
  { date: 'Oct 01', rate: 94 },
  { date: 'Oct 05', rate: 96 },
  { date: 'Oct 10', rate: 93 },
  { date: 'Oct 15', rate: 98 },
  { date: 'Oct 20', rate: 95 },
  { date: 'Oct 25', rate: 91 },
  { date: 'Oct 31', rate: 98.4 }
];

export const environmentMatrix = [
  { browser: 'Chrome', staging: 98, qa: 99, prod: 100 },
  { browser: 'Firefox', staging: 96, qa: 97, prod: 100 },
  { browser: 'Safari', staging: 82, qa: 91, prod: 98, failed: true },
  { browser: 'Edge', staging: 99, qa: 100, prod: 100 }
];

export const durationDistribution = [
  { range: '0-10s', runs: 120, height: '10%' },
  { range: '10-20s', runs: 240, height: '15%' },
  { range: '20-30s', runs: 650, height: '30%' },
  { range: '30-40s', runs: 1200, height: '55%' },
  { range: '40-50s (Median)', runs: 4200, height: '85%', current: true },
  { range: '50-60s', runs: 2100, height: '60%' },
  { range: '60-70s', runs: 950, height: '40%' },
  { range: '70-80s', runs: 410, height: '25%' },
  { range: '80-90s', runs: 180, height: '15%' },
  { range: '90-100s (Anomalies)', runs: 95, height: '8%', failed: true },
  { range: '>100s', runs: 50, height: '5%' }
];

export const topFlakyTests = [
  { id: 'AUTH-092', path: 'src/tests/integration/login_flow.spec.ts', rate: '18.4%', trend: '+2.1%', trendStatus: 'up' },
  { id: 'CHCK-104', path: 'src/tests/e2e/checkout_stripe.spec.ts', rate: '12.7%', trend: '0.0%', trendStatus: 'flat' },
  { id: 'DB-441', path: 'src/db/migrations/user_schema.test.ts', rate: '9.2%', trend: '-1.5%', trendStatus: 'down' },
  { id: 'API-882', path: 'src/api/routes/webhooks.spec.ts', rate: '7.8%', trend: '+4.0%', trendStatus: 'up' },
  { id: 'UI-019', path: 'src/components/Navigation/Nav.test.tsx', rate: '5.1%', trend: '-0.8%', trendStatus: 'down' }
];
