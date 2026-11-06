import assert from 'assert';

async function probe() {
  console.log('--- Probing Live Production Deployment ---');
  try {
    const res = await fetch('https://meal-pass-pi.vercel.app/', {
      headers: { 'User-Agent': 'MealPass-Audit-Probe/1.0' }
    });
    console.log('Status:', res.status, res.statusText);
    console.log('Headers:');
    for (const [k, v] of res.headers.entries()) {
      if (k.startsWith('x-vercel') || k === 'server' || k === 'etag' || k === 'cache-control') {
        console.log(`  ${k}: ${v}`);
      }
    }
    const html = await res.text();
    const buildMatch = html.match(/static\/([a-zA-Z0-9_-]+)\/_buildManifest\.js/);
    const buildId = buildMatch ? buildMatch[1] : 'unknown';
    console.log('Production Build ID:', buildId);

    // Check content of page for demo buttons or specific strings
    const hasDemoButton = html.includes('Fill Demo Student') || html.includes('Fill Staff Demo');
    const hasGeneralQrInfo = html.includes('General Cafeteria QR') || html.includes('Matriculation Number');
    console.log('Has Demo Login Buttons:', hasDemoButton);
    console.log('Has Matriculation Entry:', hasGeneralQrInfo);

    // Let's check a protected route directly like /student to verify if Edge Middleware is active
    const studentRes = await fetch('https://meal-pass-pi.vercel.app/student', {
      redirect: 'manual',
    });
    console.log('\nDirect /student Access Status (Middleware check):', studentRes.status);
    console.log('Location header:', studentRes.headers.get('location'));

  } catch (err) {
    console.error('Probe failed:', err);
  }
}

probe();

