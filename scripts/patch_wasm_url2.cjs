const fs = require('fs');

const file = 'src/lib/browserDb.ts';
let code = fs.readFileSync(file, 'utf8');

const oldUrl = "`./${file}`";
const newUrl = "import.meta.env.BASE_URL + file";

code = code.replace(oldUrl, newUrl);

fs.writeFileSync(file, code);
