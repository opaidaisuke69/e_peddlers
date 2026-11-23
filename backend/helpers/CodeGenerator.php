<?php
/**
 * Identifier and Code Generator Helper
 */

class CodeGenerator {
    public static function generateApplicationNumber(PDO $pdo): string {
        do {
            // Generate a 16-digit random number
            $number = (string)random_int(1000000000000000, 9999999999999999);
            $stmt = $pdo->prepare("SELECT id FROM permit_applications WHERE application_number = ? LIMIT 1");
            $stmt->execute([$number]);
        } while ($stmt->fetch());

        return $number;
    }

    public static function generatePeddlerCode(PDO $pdo): string {
        $year = date('Y');
        do {
            // Generate 5 random digits (10000 - 99999)
            $random5 = sprintf("%05d", random_int(10000, 99999));
            $code = "PED-{$year}-{$random5}";
            $stmt = $pdo->prepare("SELECT id FROM peddlers WHERE peddler_code = ? LIMIT 1");
            $stmt->execute([$code]);
        } while ($stmt->fetch());

        return $code;
    }

    public static function generatePermitNumber(PDO $pdo): string {
        $year = date('Y');
        do {
            // Generate 5 random digits (10000 - 99999)
            $random5 = sprintf("%05d", random_int(10000, 99999));
            $code = "PERMIT-{$year}-{$random5}";
            $stmt = $pdo->prepare("SELECT id FROM permits WHERE permit_number = ? LIMIT 1");
            $stmt->execute([$code]);
        } while ($stmt->fetch());

        return $code;
    }

    public static function generateOrNumber(PDO $pdo): string {
        $year = date('Y');
        $stmt = $pdo->query("SELECT MAX(id) as max_id FROM official_receipts");
        $row = $stmt->fetch();
        $nextNum = ($row['max_id'] ?? 0) + 1;
        return sprintf("OR-LC-%s-%04d", $year, $nextNum);
    }

    public static function generateArkabalaTransactionCode(PDO $pdo, int $weekNumber): string {
        $year = date('Y');
        $stmt = $pdo->query("SELECT MAX(id) as max_id FROM arkabala_collections");
        $row = $stmt->fetch();
        $nextNum = ($row['max_id'] ?? 0) + 1;
        return sprintf("ARK-%s-W%02d-%04d", $year, $weekNumber, $nextNum);
    }

    public static function generateViolationNumber(PDO $pdo): string {
        $year = date('Y');
        $stmt = $pdo->query("SELECT MAX(id) as max_id FROM peddler_violations");
        $row = $stmt->fetch();
        $nextNum = ($row['max_id'] ?? 0) + 1;
        return sprintf("VIOL-%s-%04d", $year, $nextNum);
    }

    public static function generateQrToken(string $peddlerCode): string {
        $entropy = bin2hex(random_bytes(8));
        return "QR-{$peddlerCode}-TOKEN-" . strtoupper($entropy);
    }
}
