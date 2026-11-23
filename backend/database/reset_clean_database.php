<?php
/**
 * Database Reset Script: Keep Only Important Master & Configuration Data
 * Empties all transactional records, test peddlers, applications, permits,
 * payments, violations, logs, and notifications.
 * Preserves roles, system settings, permit fee schedules, violation types,
 * market slots structure (reset to AVAILABLE), and the 4 essential staff accounts.
 */

require_once dirname(__DIR__) . '/config/database.php';

try {
    $pdo = Database::getConnection();
    echo "======================================================\n";
    echo "e-Peddlers: Resetting Database to Clean Essential State\n";
    echo "======================================================\n\n";

    // Disable foreign key checks for safe truncation
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    // List of transactional and operational tables to EMPTY (TRUNCATE)
    $tablesToTruncate = [
        'activity_logs',
        'application_approvals',
        'application_documents',
        'application_history',
        'application_renewals',
        'application_signatures',
        'arkabala_collections',
        'arkabala_payments',
        'email_logs',
        'emergency_contacts',
        'fee_snapshots',
        'notifications',
        'official_receipts',
        'otp_verifications',
        'payment_transactions',
        'payment_webhooks',
        'peddler_addresses',
        'peddler_qr_codes',
        'peddler_violations',
        'peddlers',
        'permit_applications',
        'permit_documents',
        'permit_payments',
        'permit_validity',
        'permits',
        'system_announcements',
        'user_sessions',
        'violation_payments',
    ];

    echo "Truncating transactional & operational tables...\n";
    foreach ($tablesToTruncate as $table) {
        $pdo->exec("TRUNCATE TABLE `$table`;");
        echo "  - Truncated `$table` (AUTO_INCREMENT reset to 1)\n";
    }

    // Clean users table: Keep ONLY the 4 staff accounts (Admin, Treasury, Sanitary, Inspector)
    echo "\nCleaning `users` table...\n";
    // Delete all users that have role_id = 5 (peddler) or id > 4
    $pdo->exec("DELETE FROM `users` WHERE `role_id` = 5 OR `id` > 4;");
    // Ensure staff users have peddler_id set to NULL and status is active
    $pdo->exec("UPDATE `users` SET `peddler_id` = NULL, `status` = 'active' WHERE `id` <= 4;");
    // Reset auto-increment for next registered user
    $pdo->exec("ALTER TABLE `users` AUTO_INCREMENT = 5;");
    echo "  - Cleaned `users` table: only the 4 staff accounts preserved.\n";

    // Reset market_slots to clean initial state (all 300 slots set to AVAILABLE)
    echo "\nResetting `market_slots`...\n";
    $pdo->exec("
        UPDATE `market_slots`
        SET `status` = 'AVAILABLE',
            `assigned_application_id` = NULL,
            `assigned_peddler_id` = NULL,
            `notes` = NULL
    ");
    $slotCount = $pdo->query("SELECT COUNT(*) FROM `market_slots`")->fetchColumn();
    echo "  - Reset all $slotCount market slots to AVAILABLE.\n";

    // Clean uploads/documents directory of test documents
    echo "\nCleaning uploaded test files in `backend/uploads/documents/`...\n";
    $uploadsDocDir = dirname(__DIR__) . '/uploads/documents';
    if (is_dir($uploadsDocDir)) {
        $files = glob($uploadsDocDir . '/*');
        $deletedFiles = 0;
        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
                $deletedFiles++;
            }
        }
        echo "  - Removed $deletedFiles test file(s) from uploads/documents.\n";
    }

    // Re-enable foreign key checks
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    echo "\n======================================================\n";
    echo "POST-CLEANUP DATABASE SUMMARY (ALL 35 TABLES):\n";
    echo "======================================================\n";
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $totalRows = 0;
    foreach ($tables as $t) {
        $count = (int)$pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
        $totalRows += $count;
        $label = ($count > 0) ? "[PRESERVED: $count records]" : "[EMPTY: 0 records]";
        echo sprintf("%-30s %s\n", $t, $label);
    }

    echo "\nPreserved Staff Accounts:\n";
    $staff = $pdo->query("SELECT u.id, r.name as role, u.username, u.email, u.first_name, u.last_name FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.id ASC")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($staff as $s) {
        echo sprintf("  ID %d | %-10s | %-25s | %s %s\n", $s['id'], strtoupper($s['role']), $s['email'], $s['first_name'], $s['last_name']);
    }

    echo "\nDatabase clean-up finished successfully!\n";

} catch (Exception $e) {
    echo "ERROR during cleanup: " . $e->getMessage() . "\n";
    exit(1);
}
