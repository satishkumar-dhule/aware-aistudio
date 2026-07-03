const fs = require('fs');
let code = fs.readFileSync('src/components/TestCaseModal.tsx', 'utf8');

const hookFix = `
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (!selectedTest) return;
      
      const currentIndex = testCases.findIndex(t => t.id === selectedTest.id);
      const hasNext = currentIndex < testCases.length - 1;
      const hasPrev = currentIndex > 0;
      
      if (e.key === 'ArrowRight' && hasNext) {
        setSelectedTest(testCases[currentIndex + 1]);
      }
      if (e.key === 'ArrowLeft' && hasPrev) {
        setSelectedTest(testCases[currentIndex - 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTest, testCases, onClose]);

  if (!selectedTest) return null;

  const currentIndex = testCases.findIndex(t => t.id === selectedTest.id);
  const hasNext = currentIndex < testCases.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNext = () => {
    if (hasNext) setSelectedTest(testCases[currentIndex + 1]);
  };

  const handlePrev = () => {
    if (hasPrev) setSelectedTest(testCases[currentIndex - 1]);
  };
`;

code = code.replace(/  if \(!selectedTest\) return null;[\s\S]*?\}, \[hasNext, hasPrev, handleNext, handlePrev, onClose\]\);/m, hookFix.trim());

fs.writeFileSync('src/components/TestCaseModal.tsx', code);
