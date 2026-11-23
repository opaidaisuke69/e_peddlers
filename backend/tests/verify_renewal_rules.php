<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/FeeCalculatorService.php';

$pdo = Database::getConnection();

echo "=== VERIFYING MUNICIPAL PERMIT & RENEWAL RULES ===\n\n";

// Test 1: Check active permit validity in database
$activePermits = $pdo->query("SELECT valid_until, COUNT(*) as cnt FROM permits WHERE status = 'active' GROUP BY valid_until")->fetchAll(PDO::FETCH_ASSOC);
echo "1. Permit Validity in Database:\n";
foreach ($activePermits as $ap) {
    echo "   - valid_until: {$ap['valid_until']} (Count: {$ap['cnt']})\n";
}

// Test 2: Fee Calculator - On-time vs Late Renewal
$onTimeFee = FeeCalculatorService::calculate(1, 0, false);
$lateFee = FeeCalculatorService::calculate(1, 0, true);
echo "\n2. Fee Calculator Verification (1 Papag / Lag-it):\n";
echo "   - On-time Renewal: Base ₱{$onTimeFee['subtotal']} + Penalty ₱{$onTimeFee['penalty_amount']} = Total ₱{$onTimeFee['total_amount']}\n";
echo "   - Late Renewal:    Base ₱{$lateFee['subtotal']} + Penalty ₱{$lateFee['penalty_amount']} = Total ₱{$lateFee['total_amount']}\n";
assert($onTimeFee['penalty_amount'] == 0.00, "On-time should have 0 penalty");
assert($lateFee['penalty_amount'] == 200.00, "Late renewal should have 200 penalty");

// Test 3: API search-renewal on active unexpired permit (PED-2026-0352)
echo "\n3. API Search on Active Unexpired Permit (PED-2026-0352):\n";
$ch = curl_init('http://localhost:8000/api/applications/search-renewal?identifier=PED-2026-0352');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$json = json_decode($res, true);
echo "   - Status Code: {$code} (Expected: 422)\n";
echo "   - Error Message: " . ($json['message'] ?? '') . "\n";
assert($code === 422, "Active permit must not be eligible for renewal before expiry");

// Test 4: API search-renewal on expired permit (PED-2026-12345)
echo "\n4. API Search on Expired Permit (PED-2026-12345):\n";
$ch = curl_init('http://localhost:8000/api/applications/search-renewal?identifier=PED-2026-12345');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$json = json_decode($res, true);
echo "   - Status Code: {$code} (Expected: 200)\n";
echo "   - Is Late Renewal: " . ($json['data']['is_late_renewal'] ? 'true' : 'false') . " (Expected: true)\n";
echo "   - Total Fee: " . ($json['data']['fee_estimate']['formatted_total'] ?? '') . " (Expected: ₱850.00)\n";
echo "   - Penalty Note: " . ($json['data']['penalty_note'] ?? '') . "\n";
assert($code === 200, "Expired permit must be eligible for renewal");
assert($json['data']['is_late_renewal'] === true, "Must be flagged as late renewal past Jan 31");

echo "\n>>> ALL MUNICIPAL PERMIT & RENEWAL CHECKS PASSED SUCCESSFULLY! <<<\n";
