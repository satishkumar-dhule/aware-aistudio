const fs = require('fs');
let code = fs.readFileSync('src/components/RunsView.tsx', 'utf8');

if (!code.includes('TestCaseModal')) {
  // Add imports
  code = code.replace(
    "import { Run, TestCase } from '../types';",
    "import { Run, TestCase } from '../types';\nimport TestCaseModal from './TestCaseModal';"
  );

  // Add state for modal
  code = code.replace(
    "  const [currentPage, setCurrentPage] = useState(1);",
    "  const [currentPage, setCurrentPage] = useState(1);\n  const [modalTestCaseId, setModalTestCaseId] = useState<string | null>(null);"
  );

  // Replace onClick
  code = code.replace(
    /onClick=\{\(\) => onSelectTest\(tc\.id\)\}/g,
    "onClick={() => setModalTestCaseId(tc.id)}"
  );

  // Add Modal at the end
  code = code.replace(
    "    </div>\n  );\n}",
    "      {modalTestCaseId && (\n        <TestCaseModal \n          testCases={runTestCases} \n          initialTestId={modalTestCaseId} \n          onClose={() => setModalTestCaseId(null)} \n          onShowToast={onShowToast}\n        />\n      )}\n    </div>\n  );\n}"
  );

  fs.writeFileSync('src/components/RunsView.tsx', code);
}
