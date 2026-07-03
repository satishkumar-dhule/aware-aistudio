const fs = require('fs');

function patchFile(filename, importsToAdd, testCasesProvider) {
  let code = fs.readFileSync(filename, 'utf8');
  if (code.includes('TestCaseModal')) return;

  code = code.replace(
    "import { BrowserDb } from '../lib/browserDb';",
    "import { BrowserDb } from '../lib/browserDb';\nimport TestCaseModal from './TestCaseModal';"
  );
  
  // if not TestCase imported, import it
  if (!code.includes('TestCase }')) {
    code = code.replace(
      "import {",
      "import { TestCase,"
    );
  }

  const [_, componentName] = code.match(/export default function ([A-Za-z]+)\(/);
  
  const stateToAdd = `\n  const [modalTestCaseId, setModalTestCaseId] = useState<string | null>(null);\n  const allTestCases = BrowserDb.getTestCases();\n`;
  code = code.replace(
    new RegExp(`export default function ${componentName}\\([^)]+\\) \\{`),
    match => match + stateToAdd
  );

  code = code.replace(/onSelectTest\(/g, "setModalTestCaseId(");

  const modalHtml = `      {modalTestCaseId && (
        <TestCaseModal 
          testCases={${testCasesProvider}} 
          initialTestId={modalTestCaseId} 
          onClose={() => setModalTestCaseId(null)} 
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
}`;

  code = code.replace(
    /    <\/div>\n  \);\n}/,
    modalHtml
  );

  fs.writeFileSync(filename, code);
}

patchFile('src/components/SuitesView.tsx', '', 'allTestCases');
patchFile('src/components/AnalyticsView.tsx', '', 'allTestCases');
patchFile('src/components/ComparisonView.tsx', '', 'allTestCases');

