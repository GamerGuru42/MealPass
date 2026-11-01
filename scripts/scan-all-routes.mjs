import fs from 'fs';
import path from 'path';

const apiDir = 'src/app/api';

function scanDir(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(scanDir(full));
    } else if (entry.name === 'route.ts') {
      files.push(full);
    }
  }
  return files;
}

const routes = scanDir(apiDir);
console.log(`Found ${routes.length} route files:`);

for (const file of routes) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const routePath = '/' + rel.replace('src/app/', '').replace('/route.ts', '');
  
  const methods = [];
  if (content.includes('export async function GET')) methods.push('GET');
  if (content.includes('export async function POST')) methods.push('POST');
  if (content.includes('export async function PATCH')) methods.push('PATCH');
  if (content.includes('export async function DELETE')) methods.push('DELETE');

  const authCalls = [];
  const requireAuthMatches = content.matchAll(/requireAuth\(([^)]+)\)/g);
  for (const m of requireAuthMatches) {
    authCalls.push(`requireAuth: ${m[1].trim()}`);
  }
  const authReqMatches = content.matchAll(/authenticateRequest\(([^)]+)\)/g);
  for (const m of authReqMatches) {
    authCalls.push(`authenticateRequest: ${m[1].trim()}`);
  }

  const usesAdminClient = content.includes('createAdminClient') || content.includes('MealPassService');

  console.log(`\nRoute: ${routePath} [${methods.join(', ')}]`);
  console.log(`  Auth: ${authCalls.length > 0 ? authCalls.join(' | ') : 'None'}`);
  console.log(`  Uses Service/Admin: ${usesAdminClient}`);
}
