const fs = require('fs');
const path = 'lib/api.ts';
let c = fs.readFileSync(path, 'utf8');

// Force-rebuild the broken section
const startMarker = '  deactivate: (userId: string) =>';
const endMarker = '  resetPassword: (data: { email: string; newPassword: string; tenantId?: string }) =>';

const startIdx = c.indexOf(startMarker);
const endIdx = c.indexOf(endMarker);
console.log('startIdx:', startIdx, 'endIdx:', endIdx);

if (startIdx > -1 && endIdx > -1) {
  // Replace with a clean version
  const newBlock =
    '  deactivate: (userId: string) =>\n' +
    '    fetchApi<any>(`/users/${userId}/deactivate`, { method: \'POST\' }),\n' +
    '\n' +
    '  reactivate: (userId: string) =>\n' +
    '    fetchApi<any>(`/users/${userId}/reactivate`, { method: \'POST\' }),\n' +
    '\n' +
    '  resetPassword: (data: { email: string; newPassword: string; tenantId?: string }) =>';
  c = c.substring(0, startIdx) + newBlock + c.substring(endIdx + endMarker.length);
  fs.writeFileSync(path, c, 'utf8');
  console.log('Rewrote section');
}
