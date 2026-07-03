const fs = require('fs');

const file = 'src/lib/browserDb.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace("import initSqlJs from 'sql.js';", "import initSqlJs from 'sql.js';\nimport sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';");

const oldUrl = "import.meta.env.BASE_URL + file";
const newUrl = "sqlWasmUrl";

code = code.replace(oldUrl, newUrl);

fs.writeFileSync(file, code);
