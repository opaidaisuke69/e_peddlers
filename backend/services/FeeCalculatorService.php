<?php
/**
 * Permit Tax and Fee Computation Engine
 * Section 7:
 * Fixed fees:
 *   Mayor's Permit: ₱110
 *   Sanitary Permit: ₱55
 *   Health Certificate: ₱110
 *   Garbage Fee: ₱55
 *   Barangay Clearance: ₱10
 *   Peddlers Tax: ₱200
 *   Fixed subtotal = ₱540
 * Per Unit Fee:
 *   Occupational Tax = ₱110 per Papag/Lag-it (Total units = Papag + Lag-it)
 * Total Permit Fee = ₱540 + (₱110 * Total units)
 * Penalty (if applicable):
 *   Late Registration: ₱200
 */

class FeeCalculatorService {
    public static function calculate(int $numPapag, int $numLagIt, bool $isLateRenewal = false): array {
        $pdo = Database::getConnection();

        // Load active fees from database
        $stmt = $pdo->query("SELECT * FROM permit_fees WHERE is_active = 1");
        $fees = $stmt->fetchAll();

        $feeItems = [];
        $subtotal = 0.0;
        $totalUnits = max(0, $numPapag + $numLagIt);

        $occupationalRate = 110.00;

        foreach ($fees as $fee) {
            $amount = (float)$fee['amount'];

            if ($fee['code'] === 'OCCUPATIONAL_TAX') {
                $occupationalRate = $amount;
                $lineTotal = $amount * $totalUnits;
                $feeItems[] = [
                    'code' => $fee['code'],
                    'name' => "{$fee['name']} ({$totalUnits} units @ ₱" . number_format($amount, 2) . ")",
                    'rate' => $amount,
                    'units' => $totalUnits,
                    'amount' => $lineTotal,
                ];
                $subtotal += $lineTotal;
            } else {
                $feeItems[] = [
                    'code' => $fee['code'],
                    'name' => $fee['name'],
                    'rate' => $amount,
                    'units' => 1,
                    'amount' => $amount,
                ];
                $subtotal += $amount;
            }
        }

        // If no fees found in DB, use default formula
        if (empty($feeItems)) {
            $occupationalTax = 110.00 * $totalUnits;
            $feeItems = [
                ['code' => 'MAYORS_PERMIT', 'name' => "Mayor's Permit", 'amount' => 110.00],
                ['code' => 'SANITARY_PERMIT', 'name' => 'Sanitary Permit', 'amount' => 55.00],
                ['code' => 'HEALTH_CERT', 'name' => 'Health Certificate', 'amount' => 110.00],
                ['code' => 'OCCUPATIONAL_TAX', 'name' => "Occupational Tax ($totalUnits units @ ₱110.00)", 'amount' => $occupationalTax],
                ['code' => 'GARBAGE_FEE', 'name' => 'Garbage Fee', 'amount' => 55.00],
                ['code' => 'BARANGAY_CLEARANCE', 'name' => 'Barangay Clearance', 'amount' => 10.00],
                ['code' => 'PEDDLERS_TAX', 'name' => 'Peddlers Tax', 'amount' => 200.00],
            ];
            $subtotal = 540.00 + $occupationalTax;
        }

        $penaltyAmount = 0.00;
        if ($isLateRenewal) {
            // Check system settings for late fee
            $stmtPenalty = $pdo->query("SELECT setting_value FROM system_settings WHERE setting_key = 'late_registration_penalty'");
            $penaltySetting = $stmtPenalty->fetch();
            $penaltyAmount = $penaltySetting ? (float)$penaltySetting['setting_value'] : 200.00;

            $feeItems[] = [
                'code' => 'LATE_PENALTY',
                'name' => 'Late Registration Penalty (1 Month Past Due)',
                'rate' => $penaltyAmount,
                'units' => 1,
                'amount' => $penaltyAmount,
            ];
        }

        $totalAmount = $subtotal + $penaltyAmount;

        return [
            'num_papag' => $numPapag,
            'num_lag_it' => $numLagIt,
            'total_units' => $totalUnits,
            'items' => $feeItems,
            'subtotal' => round($subtotal, 2),
            'penalty_amount' => round($penaltyAmount, 2),
            'total_amount' => round($totalAmount, 2),
            'formatted_total' => '₱' . number_format($totalAmount, 2),
        ];
    }
}
