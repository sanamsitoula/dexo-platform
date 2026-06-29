const fs = require('fs');
let c = fs.readFileSync('lib/api.ts', 'utf8');

// Count the exact deactivate string
const target = 'fetchApi<any>(' + '`/users/' + '${userId}/deactivate' + '`,' + ' { method: ' + "'POST'" + ' })';
const count = (c.match(new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
console.log('Found deactivate pattern:', count);

// Find any line containing 'deactivate' and dump
const lines = c.split(/\r?\n/);
lines.forEach((line, i) => {
  if (line.includes('deactivate')) {
    console.log(`Line ${i + 1}: ${JSON.stringify(line)}`);
  }
});

// Force-fix the lines by re-writing the whole usersApi block
const fixed = c.replace(
  /deactivate: \(userId: string\) =>\s*\n\s*fetchApi<any>\(`\/users\/\$\{userId\}\/deactivate`, \{ method: 'POST' \}\),\s*\n/,
  "deactivate: (userId: string) =>\n    fetchApi<any>(`/users/${userId}/deactivate`, { method: 'POST' }),\n"
).replace(
  /reactivate: \(userId: string\) =>\s*\n\s*fetchApi<any>\(`\/users\/\$\{userId\}\/reactivate`, \{ method: 'POST' \}\),\s*\n/,
  "reactivate: (userId: string) =>\n    fetchApi<any>(`/users/${userId}/reactivate`, { method: 'POST' }),\n"
);

if (fixed !== c) {
  fs.writeFileSync('lib/api.ts', fixed, 'utf8');
  console.log('Fixed and saved');
} else {
  console.log('No changes needed');
}
