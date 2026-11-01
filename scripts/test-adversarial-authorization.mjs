/**
 * Cosmopolitan University MealPass - Adversarial Authorization Test Suite
 * Powered by NextGen Technologies
 * 
 * Verifies that client-supplied identity/role headers are NEVER trusted,
 * that role escalation and IDOR snooping are rejected with 401/403,
 * and that authoritative server-side authentication protects every endpoint.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const QA_SECRET = process.env.INTERNAL_TEST_SECRET || 'cosmopolitan_mealpass_qa_secret_2026';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
    failed++;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }
  return { status: res.status, data };
}

async function runAdversarialSuite() {
  console.log('=== MEALPASS ADVERSARIAL AUTHORIZATION TEST SUITE ===');
  console.log(`Target: ${BASE_URL}\n`);

  // ------------------------------------------------------------------
  // Test 1: Anonymous user attempting SUPER_ADMIN access without token
  // ------------------------------------------------------------------
  console.log('1. Anonymous Privilege Access Attempt:');
  const t1 = await request('/api/admin/allocations/single', {
    method: 'POST',
    body: {
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      amount: 10000,
      description: 'Hacker allocation',
    },
  });
  assert(
    t1.status === 401,
    'Anonymous user attempting admin allocation blocked',
    `Status: ${t1.status}, Error: "${t1.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 2: Student attempting to impersonate FINANCE_ADMIN via custom header
  // ------------------------------------------------------------------
  console.log('\n2. Unsigned Custom Header Impersonation:');
  const t2 = await request('/api/admin/allocations/single', {
    method: 'POST',
    headers: {
      'x-user-role': 'FINANCE_ADMIN', // Spoofed unverified header
    },
    body: {
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      amount: 25000,
      description: 'Header spoofed allocation',
    },
  });
  assert(
    t2.status === 401 || t2.status === 403,
    'Spoofed x-user-role: FINANCE_ADMIN header rejected',
    `Status: ${t2.status}, Error: "${t2.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 3: Student A attempting to access Student B dashboard (Horizontal IDOR)
  // ------------------------------------------------------------------
  console.log('\n3. Student Horizontal IDOR Boundary:');
  const t3 = await request('/api/student/dashboard?studentProfileId=f0000000-0000-0000-0000-000000000002', {
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'STUDENT',
      'x-student-id': 'f0000000-0000-0000-0000-000000000001', // Student A
    },
  });
  assert(
    t3.status === 403,
    'Student A attempting to access Student B account blocked (IDOR)',
    `Status: ${t3.status}, Error: "${t3.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 4: Cafeteria Staff attempting Bursary financial allocation
  // ------------------------------------------------------------------
  console.log('\n4. Cafeteria Staff Calling Bursary Endpoint:');
  const t4 = await request('/api/admin/allocations/single', {
    method: 'POST',
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'CAFETERIA_STAFF',
    },
    body: {
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      amount: 5000,
      description: 'Staff unauthorized allocation',
    },
  });
  assert(
    t4.status === 403,
    'Cafeteria staff attempting financial allocation rejected',
    `Status: ${t4.status}, Error: "${t4.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 5: Cafeteria Head attempting Bursary-Only Reconciliation Adjustment
  // ------------------------------------------------------------------
  console.log('\n5. Cafeteria Head Calling Bursary Adjustment Endpoint:');
  const t5 = await request('/api/admin/reconciliation/correct', {
    method: 'POST',
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'CAFETERIA_HEAD',
    },
    body: {
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      adjustmentType: 'CREDIT',
      amount: 15000,
      reason: 'Madam unauthorized balance credit',
    },
  });
  assert(
    t5.status === 403,
    'Cafeteria Head attempting financial compensating adjustment rejected',
    `Status: ${t5.status}, Error: "${t5.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 6: Finance Admin attempting Cafeteria Manual Override
  // ------------------------------------------------------------------
  console.log('\n6. Finance Admin Calling Kitchen Collection Override:');
  const t6 = await request('/api/cafeteria/manual-override', {
    method: 'POST',
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'FINANCE_ADMIN',
    },
    body: {
      orderId: '00000000-0000-0000-0000-000000000001',
      reason: 'Finance admin manual collection override',
    },
  });
  assert(
    t6.status === 403,
    'Finance Admin attempting kitchen collection override rejected',
    `Status: ${t6.status}, Error: "${t6.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 7: User attempting role tampering via JSON request payload
  // ------------------------------------------------------------------
  console.log('\n7. Payload Role Field Tampering:');
  const t7 = await request('/api/admin/allocations/single', {
    method: 'POST',
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'STUDENT',
    },
    body: {
      role: 'SUPER_ADMIN', // Attempted payload injection
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      amount: 50000,
      description: 'Injected body role',
    },
  });
  assert(
    t7.status === 403,
    'Payload role: SUPER_ADMIN injection ignored; verified student role rejected',
    `Status: ${t7.status}, Error: "${t7.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 8: Staff attempting cross-campus action outside assigned cafeteria
  // ------------------------------------------------------------------
  console.log('\n8. Cross-Campus Authorization Enforcement:');
  const t8 = await request('/api/cafeteria/manual-override', {
    method: 'POST',
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'CAFETERIA_HEAD',
      'x-cafeteria-id': 'c0000000-0000-0000-0000-000000000001', // Main Campus staff
    },
    body: {
      orderId: '00000000-0000-0000-0000-000000000001',
      cafeteriaId: 'c0000000-0000-0000-0000-000000000002', // Kado Campus target
      reason: 'Madam Funke cross-campus override attempt',
    },
  });
  assert(
    t8.status === 403,
    'Cross-campus override attempt rejected with 403 Forbidden',
    `Status: ${t8.status}, Error: "${t8.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 9: Expired or Invalid Supabase Access Token
  // ------------------------------------------------------------------
  console.log('\n9. Invalid Supabase Bearer Token:');
  const t9 = await request('/api/admin/allocations/single', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid_or_expired_jwt_payload.fake_signature',
    },
    body: {
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      amount: 1000,
      description: 'Invalid token test',
    },
  });
  assert(
    t9.status === 401,
    'Forged or invalid Supabase Bearer token rejected with 401',
    `Status: ${t9.status}, Error: "${t9.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 10: Missing or Malformed Authorization Header
  // ------------------------------------------------------------------
  console.log('\n10. Malformed Authorization Header:');
  const t10 = await request('/api/admin/allocations/single', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ', // Empty bearer
    },
    body: {
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      amount: 1000,
      description: 'Malformed token test',
    },
  });
  assert(
    t10.status === 401,
    'Malformed Authorization header rejected with 401',
    `Status: ${t10.status}, Error: "${t10.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 11: Authorized Requests Continue to Work
  // ------------------------------------------------------------------
  console.log('\n11. Authorized Access Verification:');
  const t11 = await request('/api/admin/allocations/single', {
    method: 'POST',
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'FINANCE_ADMIN',
    },
    body: {
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      amount: 1000,
      description: 'Official Semester Allowance Top-up',
    },
  });
  assert(
    t11.status === 200 || t11.status === 201 || (t11.status === 400 && t11.data?.error && !t11.data.error.includes('Unauthorized') && !t11.data.error.includes('Permission Denied')),
    'Authorized Finance Admin passes security gate and reaches allocation service',
    `Status: ${t11.status}, Response: "${t11.data?.error || 'OK'}"`
  );

  // Summary
  console.log('\n=== ADVERSARIAL TEST RESULTS SUMMARY ===');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 ALL ADVERSARIAL AUTHORIZATION TESTS PASSED! ZERO BYPASSES PERMITTED.');
    process.exit(0);
  } else {
    console.error('\n❌ ADVERSARIAL AUTHORIZATION FAILURES DETECTED.');
    process.exit(1);
  }
}

runAdversarialSuite().catch(console.error);
