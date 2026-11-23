<?php
/**
 * Database Setup Script for e-Peddlers
 * Executes schema.sql and seed.sql on MySQL database `e_peddlers`.
 */

$host = '127.0.0.1';
$user = 'root';
$pass = '';

echo "Connecting to MySQL server at $host...\n";

try {
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    echo "[OK] Connected to MySQL server successfully.\n";

    echo "Creating database `e_peddlers` if not exists...\n";
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `e_peddlers` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    $pdo->exec("USE `e_peddlers`;");
    echo "[OK] Using database `e_peddlers`.\n";

    $schemaFile = __DIR__ . '/schema.sql';
    if (file_exists($schemaFile)) {
        echo "Executing schema.sql...\n";
        $schemaSql = file_get_contents($schemaFile);
        $pdo->exec($schemaSql);
        echo "[OK] Schema executed successfully.\n";
    } else {
        echo "[WARN] schema.sql not found at $schemaFile\n";
    }

    $seedFile = __DIR__ . '/seed.sql';
    if (file_exists($seedFile)) {
        echo "Executing seed.sql...\n";
        $seedSql = file_get_contents($seedFile);
        $pdo->exec($seedSql);
        echo "[OK] Seed data inserted successfully.\n";
    } else {
        echo "[WARN] seed.sql not found at $seedFile\n";
    }

    // Verify row counts
    $stmt = $pdo->query("SELECT COUNT(*) AS total FROM users");
    $usersCount = $stmt->fetch()['total'];

    $stmt = $pdo->query("SELECT COUNT(*) AS total FROM permit_applications");
    $appsCount = $stmt->fetch()['total'];

    echo "\n=== Setup Verification ===\n";
    echo "Users count: $usersCount\n";
    echo "Applications count: $appsCount\n";
    echo "Database `e_peddlers` is fully configured and ready!\n";

} catch (Exception $e) {
    echo "[ERROR] Database setup failed: " . $e->getMessage() . "\n";
    exit(1);
}
