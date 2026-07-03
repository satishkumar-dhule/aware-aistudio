const fs = require('fs');

const file = 'src/lib/browserDb.ts';
let code = fs.readFileSync(file, 'utf8');

const oldUrl = "`https://sql.js.org/dist/${file}`";
const newUrl = "`./${file}`";

code = code.replace(oldUrl, newUrl);

fs.writeFileSync(file, code);
