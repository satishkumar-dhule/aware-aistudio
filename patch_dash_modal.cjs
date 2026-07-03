const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

if (!code.includes('TestCaseModal')) {
  // Add imports
  code = code.replace(
    "import { Suite } from '../types';",
    "import { Suite, TestCase } from '../types';\nimport TestCaseModal from './TestCaseModal';"
  );

  // Add state for modal
  code = code.replace(
    "  const [dbTick, setDbTick] = useState(0);",
    "  const [dbTick, setDbTick] = useState(0);\n  const [modalTestCaseId, setModalTestCaseId] = useState<string | null>(null);\n  const allTestCases = BrowserDb.getTestCases();"
  );

  // Replace onClick
  code = code.replace(
    /onSelectTest\('verify_user_authentication'\);/g,
    "setModalTestCaseId('verify_user_authentication');"
  );
  code = code.replace(
    /onSelectTest\('submit_checkout_form'\);/g,
    "setModalTestCaseId('submit_checkout_form');"
  );
  code = code.replace(
    /onSelectTest\('user_controller_profile'\);/g,
    "setModalTestCaseId('user_controller_profile');"
  );
  // wait there's another onSelectTest
  code = code.replace(
    /onSelectTest\(item\.id\)/g,
    "setModalTestCaseId(item.id)"
  );

  // Add Modal at the end
  code = code.replace(
    "    </div>\n  );\n}",
    "      {modalTestCaseId && (\n        <TestCaseModal \n          testCases={allTestCases} \n          initialTestId={modalTestCaseId} \n          onClose={() => setModalTestCaseId(null)} \n          onShowToast={onShowToast}\n        />\n      )}\n    </div>\n  );\n}"
  );

  fs.writeFileSync('src/components/DashboardView.tsx', code);
}
