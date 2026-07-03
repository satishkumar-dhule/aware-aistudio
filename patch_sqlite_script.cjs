const fs = require('fs');
let code = fs.readFileSync('scripts/process_report_sqlite.cjs', 'utf8');

const replacement = `
let db;
try {
  db = new DatabaseSync(dbPath);
  // Test if the database is malformed
  db.exec('PRAGMA integrity_check;');
} catch (err) {
  console.warn('Database is malformed or missing. Recreating...', err.message);
  try {
    fs.unlinkSync(dbPath);
  } catch (e) {}
  db = new DatabaseSync(dbPath);
}

// Create tables if they don't exist
`;

code = code.replace(/\/\/ Ensure the db exists\nconst db = new DatabaseSync\(dbPath\);\n\n\/\/ Create tables if they don't exist\n/g, replacement);

fs.writeFileSync('scripts/process_report_sqlite.cjs', code);
