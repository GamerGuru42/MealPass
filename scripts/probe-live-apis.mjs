async function testLiveApis() {
  console.log('\n--- Probing Production Live API Endpoints ---');

  // Test 1: POST /api/cafeteria/activation-code without auth
  const actRes = await fetch('https://meal-pass-pi.vercel.app/api/cafeteria/activation-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matricNumber: 'CU/2024/0142' }),
  });
  console.log('POST /api/cafeteria/activation-code (no auth) status:', actRes.status);
  const actJson = await actRes.json();
  console.log('Response payload:', actJson);

  // Test 2: GET /api/student/dashboard without auth
  const dashRes = await fetch('https://meal-pass-pi.vercel.app/api/student/dashboard');
  console.log('GET /api/student/dashboard (no auth) status:', dashRes.status);
  const dashJson = await dashRes.json();
  console.log('Dashboard payload:', dashJson);

  // Test 3: POST /api/auth/student-lookup
  const lookupRes = await fetch('https://meal-pass-pi.vercel.app/api/auth/student-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matricNumber: 'CU/NONEXISTENT/9999' }),
  });
  console.log('POST /api/auth/student-lookup status:', lookupRes.status);
  const lookupJson = await lookupRes.json();
  console.log('Lookup payload:', lookupJson);
}

testLiveApis();

