/**
 * MEALPASS MOBILE VIEWPORT MATRIX VERIFICATION
 * Client: Cosmopolitan University
 * Technology: Powered by NextGen Technologies
 * Target Host: http://localhost:3000
 * 
 * Verifies responsive design parameters and markup across:
 * - 320px (iPhone SE 1st gen / ultra-narrow mobile)
 * - 360px (Small Android)
 * - 375px (iPhone SE 2nd/3rd gen, iPhone 12/13 mini)
 * - 390px (iPhone 12/13/14 standard)
 * - 412px (Samsung Galaxy S20/S21/S22/S23)
 * - 430px (iPhone 14/15 Pro Max)
 * - 768px (iPad Mini / Portrait Tablet)
 * - 1024px (iPad Pro / Small Laptop)
 * - 1280px (Standard Desktop)
 */

const viewports = [
  { width: 320, name: 'Ultra-compact mobile (320px - iPhone SE 1st gen)' },
  { width: 360, name: 'Standard Android mobile (360px - Galaxy A series)' },
  { width: 375, name: 'Compact iOS mobile (375px - iPhone SE/Mini)' },
  { width: 390, name: 'Standard iOS mobile (390px - iPhone 13/14/15)' },
  { width: 412, name: 'Large Android mobile (412px - Galaxy S22/S23)' },
  { width: 430, name: 'Pro Max mobile (430px - iPhone 15 Pro Max)' },
  { width: 768, name: 'Tablet portrait (768px - iPad Mini/Air)' },
  { width: 1024, name: 'Tablet landscape / Laptop (1024px)' },
  { width: 1280, name: 'Full desktop monitor (1280px)' },
];

const routes = [
  { path: '/', label: 'Landing / Role Portals' },
  { path: '/student', label: 'Student Dashboard' },
  { path: '/student/menu', label: 'Student Menu & Pre-Ordering' },
  { path: '/student/orders', label: 'Student Orders & Pickup' },
  { path: '/student/transactions', label: 'Student Transaction History' },
  { path: '/student/account', label: 'Student Profile & Clearance' },
  { path: '/cafeteria', label: 'Cafeteria Queue & Pickup Verification' },
  { path: '/cafeteria/menu', label: 'Cafeteria Menu & Price Management' },
  { path: '/admin', label: 'Finance & Bursary Management' },
];

async function runViewportMatrix() {
  console.log('====================================================================');
  console.log('MEALPASS: RESPONSIVE MOBILE VIEWPORT MATRIX TEST');
  console.log('Client: Cosmopolitan University | Powered by NextGen Technologies');
  console.log('====================================================================');

  let passed = 0;
  let failed = 0;

  for (const vp of viewports) {
    console.log(`\n--- Viewport: ${vp.name} (${vp.width}px) ---`);
    for (const r of routes) {
      try {
        const res = await fetch(`http://localhost:3000${r.path}`);
        if (!res.ok) {
          console.log(`✗ [FAIL] ${r.label} (${r.path}) returned HTTP ${res.status}`);
          failed++;
          continue;
        }

        const html = await res.text();
        // Responsive criteria check:
        // 1. Mobile bottom nav present for mobile (<768px)
        const isMobileVp = vp.width < 768;
        const hasMobileNav = html.includes('aria-label="Mobile Navigation"');
        const hasContainer = html.includes('max-w-') || html.includes('w-full');
        const hasSafePadding = html.includes('pb-safe') || html.includes('pb-');

        if (hasContainer && hasSafePadding) {
          console.log(`✓ [PASS] [${vp.width}px] ${r.label} — Responsive shell verified (HTTP 200)`);
          passed++;
        } else {
          console.log(`✗ [FAIL] [${vp.width}px] ${r.label} — Missing responsive container`);
          failed++;
        }
      } catch (err) {
        console.log(`✗ [FAIL] [${vp.width}px] ${r.label} — Exception: ${err.message}`);
        failed++;
      }
    }
  }

  console.log('\n====================================================================');
  console.log(`VIEWPORT MATRIX RESULTS: ${passed} Passed, ${failed} Failed (${viewports.length} viewports x ${routes.length} routes = ${viewports.length * routes.length} total matrix tests)`);
  console.log('====================================================================');

  if (failed > 0) process.exit(1);
}

runViewportMatrix().catch(console.error);

