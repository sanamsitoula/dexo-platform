const fs = require('fs');
let c = fs.readFileSync('lib/api.ts', 'utf8');
const lines = c.split(/\r?\n/);
const line = lines[136];
console.log('Line 137 length:', line.length);
console.log('Line 137:', line);
// Print each char code
for (let i = 0; i < line.length; i++) {
  const c2 = line[i];
  const code = c2.charCodeAt(0);
  if (code === 0x60) {
    console.log(`  [${i}] = BACKTICK (0x60)`);
  } else if (code < 32) {
    console.log(`  [${i}] = 0x${code.toString(16)} (control)`);
  } else {
    console.log(`  [${i}] = '${c2}' (0x${code.toString(16)})`);
  }
}
