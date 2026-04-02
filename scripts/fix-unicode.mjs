import { readFileSync, writeFileSync } from 'fs';

const files = [
  'wms-frontend/src/features/role/ui/PermissionMatrixDialog.tsx',
  'wms-frontend/src/pages/WorkflowConfigPage.tsx',
  'wms-frontend/src/pages/__tests__/AllPages.selectors.test.ts',
  'wms-frontend/src/pages/__tests__/EmployeesPage.selectors.test.ts',
];

let totalReplacements = 0;

for (const f of files) {
  let content = readFileSync(f, 'utf8');
  let count = 0;
  // Match \uXXXX inside string literals (both escaped forms)
  const converted = content.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
    count++;
    return String.fromCharCode(parseInt(hex, 16));
  });
  if (count > 0) {
    writeFileSync(f, converted, 'utf8');
    console.log(`${f}: ${count} replacements`);
    totalReplacements += count;
  } else {
    console.log(`${f}: no changes`);
  }
}

console.log(`\nTotal: ${totalReplacements} Unicode escapes converted to UTF-8`);
