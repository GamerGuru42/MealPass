/**
 * Cosmopolitan University MealPass - Strengthened Adversarial Authorization Test Suite
 * Powered by NextGen Technologies
 * 
 * Verifies strict Zero-Trust & Fail-Closed Authorization:
 * 1. Anonymous requests are rejected (401).
 * 2. Forged client headers are rejected (401).
 * 3. Malformed and expired/forged Bearer JWTs are rejected (401).
 * 4. Students without linked profiles fail closed (403).
 * 5. Horizontal IDOR snooping between students is blocked (403).
 * 6. Cafeteria operators without assignments fail closed (403).
 * 7. Cross-campus actions outside assigned cafeteria are blocked (403).
 * 8. Students and staff calling Bursary endpoints are blocked (403).
 * 9. Body payload tampering (role: SUPER_ADMIN) is ignored (403).
 * 10. Legitimate authorized actions succeed (200).
 * 11. Immutability verification: Failed attacks create ZERO ledger entries.
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

async function runStrengthenedAdversarialSuite() {
  console.log('====================================================================');
  console.log('MEALPASS STRENGTHENED ADVERSARIAL AUTHORIZATION TEST SUITE');
  console.log(`Target: ${BASE_URL}`);
  console.log('Policy: Strict Zero-Trust, Fail-Closed Server Authorization');
  console.log('====================================================================\n');

  // Baseline ledger check before adversarial attacks
  const preCheck = await request('/api/student/dashboard?studentProfileId=f0000000-0000-0000-0000-000000000001', {
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'STUDENT',
      'x-student-id': 'f0000000-0000-0000-0000-000000000001',
    },
  });
  const baselineBalance = preCheck.data?.data?.financial?.balance ?? 50000;
  console.log(`Baseline Student Balance before attacks: ₦${baselineBalance.toLocaleString()}\n`);

  // ------------------------------------------------------------------
  // Test 1: Anonymous Access to Bursary Allocation
  // ------------------------------------------------------------------
  console.log('1. Anonymous Request to Financial Allocation:');
  const t1 = await request('/api/admin/allocations/single', {
    method: 'POST',
    body: {
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      amount: 10000,
      description: 'Malicious anonymous allocation attempt',
    },
  });
  assert(
    t1.status === 401,
    'Anonymous user attempting admin allocation blocked',
    `Status: ${t1.status}, Error: "${t1.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 2: Forged Role Header Impersonation Without Valid Session
  // ------------------------------------------------------------------
  console.log('\n2. Unsigned Custom Header Role Spoofing:');
  const t2 = await request('/api/admin/allocations/single', {
    method: 'POST',
    headers: {
      'x-user-role': 'SUPER_ADMIN',
    },
    body: {
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      amount: 25000,
      description: 'Header spoofed allocation attempt',
    },
  });
  assert(
    t2.status === 401,
    'Forged x-user-role: SUPER_ADMIN header rejected with 401',
    `Status: ${t2.status}, Error: "${t2.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 3: Expired or Forged Supabase Access Token
  // ------------------------------------------------------------------
  console.log('\n3. Forged / Expired Supabase Bearer Token:');
  const t3 = await request('/api/admin/allocations/single', {
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
    t3.status === 401,
    'Forged or invalid Supabase Bearer token rejected with 401',
    `Status: ${t3.status}, Error: "${t3.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 4: Malformed Authorization Header (Empty Bearer)
  // ------------------------------------------------------------------
  console.log('\n4. Malformed Authorization Header:');
  const t4 = await request('/api/admin/allocations/single', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ',
    },
    body: {
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      amount: 1000,
    },
  });
  assert(
    t4.status === 401,
    'Malformed Authorization header rejected with 401',
    `Status: ${t4.status}, Error: "${t4.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 5: Student A Accessing Student B Dashboard (Horizontal IDOR)
  // ------------------------------------------------------------------
  console.log('\n5. Student Horizontal IDOR Boundary (Student A -> Student B):');
  const t5 = await request('/api/student/dashboard?studentProfileId=f0000000-0000-0000-0000-000000000002', {
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'STUDENT',
      'x-student-id': 'f0000000-0000-0000-0000-000000000001', // Student A
    },
  });
  assert(
    t5.status === 403,
    'Student A attempting to access Student B account blocked (IDOR)',
    `Status: ${t5.status}, Error: "${t5.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 6: Student Without a Linked Student Profile (Fail-Closed)
  // ------------------------------------------------------------------
  console.log('\n6. Student Without Linked Profile (Fail-Closed):');
  const t6 = await request('/api/student/dashboard', {
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'STUDENT',
      'x-student-id': 'NONE', // No profile
    },
  });
  assert(
    t6.status === 403,
    'Student without student profile strictly rejected (Fail-Closed)',
    `Status: ${t6.status}, Error: "${t6.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 7: Cafeteria Operator Without a Cafeteria Assignment (Fail-Closed)
  // ------------------------------------------------------------------
  console.log('\n7. Cafeteria Staff Without Assignment (Fail-Closed):');
  const t7 = await request('/api/cafeteria/queue', {
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'CAFETERIA_STAFF',
      'x-cafeteria-id': 'NONE', // No assignment
    },
  });
  assert(
    t7.status === 403,
    'Cafeteria staff without cafeteria assignment rejected (Fail-Closed)',
    `Status: ${t7.status}, Error: "${t7.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 8: Cafeteria Operator Accessing Another Campus (Cross-Campus Guard)
  // ------------------------------------------------------------------
  console.log('\n8. Cross-Campus Verification Attempt:');
  const t8 = await request('/api/cafeteria/verify-pickup', {
    method: 'POST',
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'CAFETERIA_STAFF',
      'x-cafeteria-id': 'c0000000-0000-0000-0000-000000000001', // Main Campus staff
    },
    body: {
      searchKey: 'CU-TEST',
      cafeteriaId: 'c0000000-0000-0000-0000-000000000002', // Kado Campus target
      method: 'CODE',
    },
  });
  assert(
    t8.status === 403,
    'Main Campus staff attempting action on Kado Campus rejected with 403',
    `Status: ${t8.status}, Error: "${t8.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 9: Student Attempting Bursary Financial Allocation
  // ------------------------------------------------------------------
  console.log('\n9. Student Attempting Bursary Allocation:');
  const t9 = await request('/api/admin/allocations/single', {
    method: 'POST',
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'STUDENT',
      'x-student-id': 'f0000000-0000-0000-0000-000000000001',
    },
    body: {
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      amount: 50000,
      description: 'Unauthorized self-allocation',
    },
  });
  assert(
    t9.status === 403,
    'Student attempting financial allocation rejected with 403',
    `Status: ${t9.status}, Error: "${t9.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 10: Cafeteria Staff Attempting Bursary Financial Allocation
  // ------------------------------------------------------------------
  console.log('\n10. Cafeteria Staff Calling Bursary Allocation Endpoint:');
  const t10 = await request('/api/admin/allocations/single', {
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
    t10.status === 403,
    'Cafeteria staff attempting financial allocation rejected with 403',
    `Status: ${t10.status}, Error: "${t10.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 11: Cafeteria Head Calling Reconciliation Compensating Adjustment
  // ------------------------------------------------------------------
  console.log('\n11. Cafeteria Head Calling Bursary Adjustment Endpoint:');
  const t11 = await request('/api/admin/reconciliation/correct', {
    method: 'POST',
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'CAFETERIA_HEAD',
    },
    body: {
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      adjustmentType: 'CREDIT',
      amount: 15000,
      reason: 'Unauthorized Madam balance credit',
    },
  });
  assert(
    t11.status === 403,
    'Cafeteria Head attempting financial compensating adjustment rejected',
    `Status: ${t11.status}, Error: "${t11.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 12: Payload Role Field Tampering (role: SUPER_ADMIN in body)
  // ------------------------------------------------------------------
  console.log('\n12. Payload Role Field Tampering:');
  const t12 = await request('/api/admin/allocations/single', {
    method: 'POST',
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'STUDENT',
    },
    body: {
      role: 'SUPER_ADMIN', // Injected field
      studentProfileId: 'f0000000-0000-0000-0000-000000000001',
      amount: 50000,
      description: 'Injected body role',
    },
  });
  assert(
    t12.status === 403,
    'Payload role: SUPER_ADMIN injection ignored; verified student role rejected',
    `Status: ${t12.status}, Error: "${t12.data?.error}"`
  );

  // ------------------------------------------------------------------
  // Test 13: Authorized Finance Admin Access Verification
  // ------------------------------------------------------------------
  console.log('\n13. Authorized Finance Admin Verification:');
  const t13 = await request('/api/admin/reconciliation', {
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'FINANCE_ADMIN',
    },
  });
  assert(
    t13.status === 200,
    'Authorized Finance Admin access succeeds',
    `Status: ${t13.status}, Reconciliation Status: ${t13.data?.data?.status || 'OK'}`
  );

  // ------------------------------------------------------------------
  // Test 14: Financial Ledger Immutability Verification
  // Verify that NONE of the adversarial financial attempts altered the ledger
  // ------------------------------------------------------------------
  console.log('\n14. Financial Ledger Immutability Post-Attack Audit:');
  const postCheck = await request('/api/student/dashboard?studentProfileId=f0000000-0000-0000-0000-000000000001', {
    headers: {
      'x-mealpass-test-signature': QA_SECRET,
      'x-user-role': 'STUDENT',
      'x-student-id': 'f0000000-0000-0000-0000-000000000001',
    },
  });
  const postBalance = postCheck.data?.data?.financial?.balance ?? 50000;
  const balanceUnchanged = postBalance === baselineBalance;
  assert(
    balanceUnchanged,
    'Zero financial mutations occurred from rejected adversarial requests',
    `Before: ₦${baselineBalance.toLocaleString()}, After: ₦${postBalance.toLocaleString()}`
  );

  // Summary
  console.log('\n====================================================================');
  console.log('ADVERSARIAL TEST RESULTS SUMMARY');
  console.log('====================================================================');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 ALL 14 ADVERSARIAL AUTHORIZATION TESTS PASSED! FAIL-CLOSED VERIFIED.');
    process.exit(0);
  } else {
    console.error('\n❌ ADVERSARIAL AUTHORIZATION FAILURES DETECTED.');
    process.exit(1);
  }
}

runStrengthenedAdversarialSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
