const fs = require('fs');
let code = fs.readFileSync('src/components/TestCaseModal.tsx', 'utf8');

const keyEffect = `
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) handleNext();
      if (e.key === 'ArrowLeft' && hasPrev) handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, hasPrev, handleNext, handlePrev, onClose]);

  return (
`;

code = code.replace("  return (\n    <div className=\"fixed", keyEffect + "    <div className=\"fixed");

fs.writeFileSync('src/components/TestCaseModal.tsx', code);
