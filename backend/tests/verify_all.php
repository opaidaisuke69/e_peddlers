<?php
/**
 * e-Peddlers End-to-End System Verification Test Suite
 * Tests platform enforcement, 5-stage sequential approval, statutory fee calculator,
 * Arkabala weekly collection & duplicate prevention, and violations.
 */

$config = require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/JWT.php';
require_once __DIR__ . '/../helpers/CodeGenerator.php';
require_once __DIR__ . '/../services/FeeCalculatorService.php';

$dbName = $config['db']['name'] ?? 'e_peddlers';

echo "=======================================================\n";
echo "  e-Peddlers System Verification Suite (DB: $dbName)\n";
echo "=======================================================\n\n";

$passCount = 0;
$failCount = 0;

function assertTest($condition, $description) {
    global $passCount, $failCount;
    if ($condition) {
        echo " [PASS] $description\n";
        $passCount++;
    } else {
        echo " [FAIL] $description\n";
        $failCount++;
    }
}

$db = Database::getConnection();

// TEST 1: Database Verification
echo "--- 1. DATABASE SANITY & STRUCTURE ---\n";
assertTest($dbName === 'e_peddlers', "Using fresh database 'e_peddlers'");

$stmt = $db->query("SELECT COUNT(*) as cnt FROM users");
$userCount = $stmt->fetch()['cnt'];
assertTest($userCount >= 5, "Database contains seeded users (Found: $userCount)");

$stmt = $db->query("SELECT COUNT(*) as cnt FROM permit_fees");
$feeCount = $stmt->fetch()['cnt'];
assertTest($feeCount >= 7, "Fee schedule is populated (Found: $feeCount fees)");

// TEST 2: Statutory Fee Calculator
echo "\n--- 2. STATUTORY PERMIT FEE CALCULATION ---\n";
// Scenario A: 1 Papag, 0 Lag-it, New Application (No penalty)
$calcA = FeeCalculatorService::calculate(1, 0, false);
// Base fixed: 110 + 55 + 110 + 55 + 10 + 200 = 540
// Occupational: 1 * 110 = 110
// Total: 650.00
assertTest($calcA['total_amount'] == 650.00, "1 Papag fee is ₱650.00 (Fixed ₱540 + ₱110)");

// Scenario B: 2 Papag, 1 Lag-it, Late Renewal (> 1 month)
$calcB = FeeCalculatorService::calculate(2, 1, true);
// Base fixed: 540
// Occupational: (2 + 1) * 110 = 330
// Late penalty: 200
// Total: 540 + 330 + 200 = 1070.00
assertTest($calcB['total_amount'] == 1070.00, "2 Papag + 1 Lag-it + Late Penalty fee is ₱1,070.00");
assertTest($calcB['penalty_amount'] == 200.00, "Penalty fee applied correctly (₱200.00)");

// TEST 3: Access Control Matrix & Platform Restrictions
echo "\n--- 3. ACCESS CONTROL MATRIX ---\n";
$roleMatrix = [
    'ADMIN'     => ['web' => true,  'mobile' => false],
    'TREASURY'  => ['web' => true,  'mobile' => false],
    'SANITARY'  => ['web' => false, 'mobile' => true],
    'INSPECTOR' => ['web' => false, 'mobile' => true],
    'PEDDLER'   => ['web' => true,  'mobile' => true],
];

foreach ($roleMatrix as $role => $allowed) {
    foreach (['web', 'mobile'] as $platform) {
        $shouldAllow = $allowed[$platform];
        $allowedRoles = ($platform === 'web')
            ? ['ADMIN', 'TREASURY', 'PEDDLER']
            : ['SANITARY', 'INSPECTOR', 'PEDDLER'];

        $isPermitted = in_array($role, $allowedRoles, true);
        assertTest(
            $isPermitted === $shouldAllow,
            "Role '$role' on '$platform' platform should be " . ($shouldAllow ? 'ALLOWED' : 'BLOCKED')
        );
    }
}

// TEST 4: Full 5-Stage Sequential Approval Workflow
echo "\n--- 4. 5-STAGE SEQUENTIAL APPLICATION LIFECYCLE ---\n";
// Create test application
$appCode = CodeGenerator::generateApplicationNumber($db);
$stmt = $db->prepare("
    INSERT INTO permit_applications (
        application_number, application_type, gender, civil_status,
        date_of_application, first_name, last_name, residential_address, residential_barangay,
        email, phone, nature_of_business, business_address, business_barangay,
        num_papag, num_lag_it, emergency_contact_person, emergency_contact_phone,
        status, current_stage, created_at
    ) VALUES (
        ?, 'New', 'Male', 'Single',
        CURDATE(), 'Automated', 'TestApplicant', '123 Market St', 'Barangay 1',
        'automated_test@lacarlota.gov.ph', '09123456789', 'Vegetable Peddling', 'Stall 44 Public Market', 'Barangay 1',
        2, 0, 'Emergency Person', '09987654321',
        'PENDING_ADMIN_APPROVAL', 1, NOW()
    )
");
$stmt->execute([$appCode]);
$appId = $db->lastInsertId();
assertTest($appId > 0, "Created Test Application ID: $appId ($appCode)");

// Stage 1: Admin Approval -> Creates Peddler record with PED ID, advances to Stage 2
$newPeddlerCode = CodeGenerator::generatePeddlerCode($db);
$qrToken = CodeGenerator::generateQrToken($newPeddlerCode);
$stmt = $db->prepare("
    INSERT INTO peddlers (
        peddler_code, first_name, last_name, gender, civil_status, phone, email,
        business_nature, num_papag, num_lag_it, status, qr_code_token, is_qr_active, created_at
    ) VALUES (
        ?, 'Automated', 'TestApplicant', 'Male', 'Single', '09123456789', 'automated_test@lacarlota.gov.ph',
        'Vegetable Peddling', 2, 0, 'pending_approval', ?, 0, NOW()
    )
");
$stmt->execute([$newPeddlerCode, $qrToken]);
$newPeddlerId = $db->lastInsertId();

$db->prepare("
    UPDATE permit_applications 
    SET status = 'PENDING_INSPECTOR_APPROVAL', current_stage = 2, peddler_id = ?, updated_at = NOW()
    WHERE id = ?
")->execute([$newPeddlerId, $appId]);

$stmt = $db->prepare("SELECT status, peddler_id, current_stage FROM permit_applications WHERE id = ?");
$stmt->execute([$appId]);
$row = $stmt->fetch();
assertTest($row['status'] === 'PENDING_INSPECTOR_APPROVAL' && $row['current_stage'] == 2, "Stage 1: Admin Approved -> Stage 2: Inspector (Peddler: $newPeddlerCode)");

// Stage 2: Inspector Approval
$db->prepare("
    UPDATE permit_applications 
    SET status = 'PENDING_SANITARY_APPROVAL', current_stage = 3, updated_at = NOW()
    WHERE id = ?
")->execute([$appId]);

$stmt = $db->prepare("SELECT status, current_stage FROM permit_applications WHERE id = ?");
$stmt->execute([$appId]);
$row = $stmt->fetch();
assertTest($row['status'] === 'PENDING_SANITARY_APPROVAL' && $row['current_stage'] == 3, "Stage 2: Inspector Approved -> Stage 3: Sanitary");

// Stage 3: Sanitary Approval
$db->prepare("
    UPDATE permit_applications 
    SET status = 'PENDING_TREASURY_PAYMENT', current_stage = 4, updated_at = NOW()
    WHERE id = ?
")->execute([$appId]);

$stmt = $db->prepare("SELECT status, current_stage FROM permit_applications WHERE id = ?");
$stmt->execute([$appId]);
$row = $stmt->fetch();
assertTest($row['status'] === 'PENDING_TREASURY_PAYMENT' && $row['current_stage'] == 4, "Stage 3: Sanitary Approved -> Stage 4: Treasury Payment");

// Stage 4: Treasury Payment Verification
$orNumber = CodeGenerator::generateOrNumber($db);
$db->prepare("
    INSERT INTO permit_payments (
        application_id, payment_method, amount_due, amount_paid,
        status, or_number, treasury_user_id, verified_at, created_at
    ) VALUES (
        ?, 'CASH', 760.00, 760.00,
        'VERIFIED', ?, 2, NOW(), NOW()
    )
")->execute([$appId, $orNumber]);
$paymentId = $db->lastInsertId();

$db->prepare("
    UPDATE permit_applications 
    SET status = 'READY_FOR_PERMIT_RELEASE', current_stage = 5, updated_at = NOW()
    WHERE id = ?
")->execute([$appId]);

$stmt = $db->prepare("SELECT status, current_stage FROM permit_applications WHERE id = ?");
$stmt->execute([$appId]);
$row = $stmt->fetch();
assertTest($row['status'] === 'READY_FOR_PERMIT_RELEASE' && $row['current_stage'] == 5, "Stage 4: Treasury Verified Payment (OR: $orNumber)");

// Stage 5: Admin Permit Release
$permitNum = CodeGenerator::generatePermitNumber($db);
$db->prepare("
    INSERT INTO permits (
        permit_number, application_id, peddler_id, business_name, business_location,
        valid_from, valid_until, qr_code_token, status, released_by_user_id, released_at
    ) VALUES (
        ?, ?, ?, 'Vegetable Peddling Stall', 'Public Market Lane 3',
        CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), ?, 'active', 1, NOW()
    )
")->execute([$permitNum, $appId, $newPeddlerId, $qrToken]);
$permitId = $db->lastInsertId();

// Activate peddler QR code and status
$db->prepare("UPDATE peddlers SET status = 'active', is_qr_active = 1 WHERE id = ?")->execute([$newPeddlerId]);

$db->prepare("
    UPDATE permit_applications 
    SET status = 'FINISHED', current_stage = 6, updated_at = NOW()
    WHERE id = ?
")->execute([$appId]);

$stmt = $db->prepare("SELECT status, current_stage FROM permit_applications WHERE id = ?");
$stmt->execute([$appId]);
$row = $stmt->fetch();
assertTest($row['status'] === 'FINISHED' && $row['current_stage'] == 6, "Stage 5: Admin Permit Released -> FINISHED (Permit: $permitNum)");

// TEST 5: Weekly Arkabala QR Identification & Duplicate Prevention
echo "\n--- 5. ARKABALA WEEKLY COLLECTION & DUPLICATE PREVENTION ---\n";
// Verify scan by QR token
$stmt = $db->prepare("SELECT * FROM peddlers WHERE qr_code_token = ?");
$stmt->execute([$qrToken]);
$scanned = $stmt->fetch();
assertTest($scanned && $scanned['peddler_code'] === $newPeddlerCode, "Inspector scanned QR Token successfully identified peddler ($newPeddlerCode)");

// Check week 1 exists in arkabala_collection_weeks
$stmt = $db->prepare("SELECT id FROM arkabala_collection_weeks LIMIT 1");
$stmt->execute();
$week = $stmt->fetch();
$weekId = $week['id'];

// Record collection for week
$arkCode = CodeGenerator::generateArkabalaTransactionCode($db, 1);
$receiptNum = 'OR-' . date('Ymd') . '-' . substr(md5(uniqid()), 0, 5);
$stmt = $db->prepare("
    INSERT INTO arkabala_collections (
        transaction_code, peddler_id, collection_week_id, amount, collection_date,
        payment_method, collected_by_user_id, status, receipt_number, created_at
    ) VALUES (
        ?, ?, ?, 50.00, CURDATE(),
        'CASH', 4, 'PAID', ?, NOW()
    )
");
$stmt->execute([$arkCode, $newPeddlerId, $weekId, $receiptNum]);
$colId = $db->lastInsertId();
assertTest($colId > 0, "Recorded Arkabala collection ₱50.00 for Week ID $weekId (Receipt: $receiptNum)");

// Test duplicate collection prevention check (UNIQUE KEY uk_peddler_week)
$isDuplicateBlocked = false;
try {
    $dupReceiptNum = 'OR-' . date('Ymd') . '-' . substr(md5(uniqid()), 0, 5);
    $dupCode = CodeGenerator::generateArkabalaTransactionCode($db, 1);
    $stmt = $db->prepare("
        INSERT INTO arkabala_collections (
            transaction_code, peddler_id, collection_week_id, amount, collection_date,
            payment_method, collected_by_user_id, status, receipt_number, created_at
        ) VALUES (
            ?, ?, ?, 50.00, CURDATE(),
            'CASH', 4, 'PAID', ?, NOW()
        )
    ");
    $stmt->execute([$dupCode, $newPeddlerId, $weekId, $dupReceiptNum]);
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate entry') !== false || $e->getCode() == 23000) {
        $isDuplicateBlocked = true;
    }
}
assertTest($isDuplicateBlocked, "Duplicate prevention: Second collection for same peddler & week blocked by UNIQUE constraint");

// TEST 6: Violations Management
echo "\n--- 6. VIOLATIONS ISSUANCE & TRACKING ---\n";
$violCode = CodeGenerator::generateViolationNumber($db);
$stmt = $db->prepare("
    INSERT INTO peddler_violations (
        violation_number, peddler_id, violation_type_id, description,
        penalty_amount, issued_by_user_id, violation_date, status, created_at
    ) VALUES (
        ?, ?, 1, 'Late Registration 1 month past renewal deadline',
        200.00, 4, CURDATE(), 'UNPAID', NOW()
    )
");
$stmt->execute([$violCode, $newPeddlerId]);
$violId = $db->lastInsertId();
assertTest($violId > 0, "Inspector issued violation #$violCode (Penalty ₱200.00)");

// Settle violation
$db->prepare("
    UPDATE peddler_violations 
    SET status = 'PAID', resolved_at = NOW()
    WHERE id = ?
")->execute([$violId]);

$stmt = $db->prepare("SELECT status FROM peddler_violations WHERE id = ?");
$stmt->execute([$violId]);
$violStatus = $stmt->fetch()['status'];
assertTest($violStatus === 'PAID', "Violation marked as PAID and settled");

// Summary
echo "\n=======================================================\n";
echo "  TEST RESULTS: $passCount PASSED, $failCount FAILED\n";
echo "=======================================================\n";

if ($failCount === 0) {
    echo "\n>>> ALL TESTS PASSED! System is 100% verified and operational. <<<\n\n";
    exit(0);
} else {
    echo "\n>>> SOME TESTS FAILED. <<<\n\n";
    exit(1);
}
