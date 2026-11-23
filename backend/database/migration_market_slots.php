<?php
/**
 * Migration & Seed Script: Saturday Market Vendor Mapping (300 Slots)
 */

require_once dirname(__DIR__) . '/config/Database.php';

try {
    $pdo = Database::getConnection();
    echo "Running Market Slots Migration...\n";

    // 1. Add assigned_slot to permit_applications if not exists
    $colsApp = $pdo->query("SHOW COLUMNS FROM permit_applications LIKE 'assigned_slot'")->fetchAll();
    if (empty($colsApp)) {
        $pdo->exec("ALTER TABLE permit_applications ADD COLUMN assigned_slot VARCHAR(20) NULL AFTER num_lag_it");
        echo "Added 'assigned_slot' column to permit_applications.\n";
    }

    // 2. Add assigned_slot to permits if not exists
    $colsPermit = $pdo->query("SHOW COLUMNS FROM permits LIKE 'assigned_slot'")->fetchAll();
    if (empty($colsPermit)) {
        $pdo->exec("ALTER TABLE permits ADD COLUMN assigned_slot VARCHAR(20) NULL AFTER business_location");
        echo "Added 'assigned_slot' column to permits.\n";
    }

    // 3. Create market_slots table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `market_slots` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `slot_code` VARCHAR(10) NOT NULL UNIQUE,
            `section_code` VARCHAR(5) NOT NULL,
            `section_name` VARCHAR(100) NOT NULL,
            `slot_number` INT NOT NULL,
            `status` ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'RESTRICTED') NOT NULL DEFAULT 'AVAILABLE',
            `assigned_application_id` INT NULL,
            `assigned_peddler_id` INT NULL,
            `notes` VARCHAR(255) NULL,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `idx_slot_status` (`status`),
            INDEX `idx_section` (`section_code`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "Ensured table 'market_slots' exists.\n";

    // 4. Check if slots already exist
    $count = (int)$pdo->query("SELECT COUNT(*) FROM market_slots")->fetchColumn();
    if ($count < 300) {
        $pdo->exec("TRUNCATE TABLE market_slots");

        $sections = [
            'A' => ['name' => 'Vegetable & Spices', 'color' => '#10b981'],
            'B' => ['name' => 'Fruits', 'color' => '#f59e0b'],
            'C' => ['name' => 'Accessories & RTW', 'color' => '#3b82f6'],
            'D' => ['name' => 'Thrift Clothes', 'color' => '#8b5cf6'],
            'E' => ['name' => 'Furniture', 'color' => '#059669'],
            'F' => ['name' => 'Flowers', 'color' => '#ec4899'],
        ];

        // Specific slots from reference image:
        // Reserved (under application review) (14 total):
        $reservedSlots = [
            'A-07', 'A-15', 'A-28',
            'B-05', 'B-16',
            'C-11', 'C-21', 'C-34',
            'D-14', 'D-28',
            'E-06', 'E-19',
            'F-19', 'F-35'
        ];

        // Restricted (Expired Permits / Unauthorized) (12 total):
        $restrictedSlots = [
            'A-38', 'A-47',
            'B-38', 'B-47',
            'C-38', 'C-47',
            'D-38', 'D-47',
            'E-33', 'E-48',
            'F-38', 'F-47'
        ];

        // Available (18 total):
        $availableSlots = [
            'A-44', 'A-45', 'A-46',
            'B-48', 'B-49', 'B-50',
            'C-08', 'C-18', 'C-48',
            'D-45', 'D-46', 'D-48',
            'E-45', 'E-46', 'E-47',
            'F-16', 'F-17', 'F-48'
        ];

        $stmt = $pdo->prepare("
            INSERT INTO market_slots (slot_code, section_code, section_name, slot_number, status, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        $stats = ['OCCUPIED' => 0, 'RESERVED' => 0, 'AVAILABLE' => 0, 'RESTRICTED' => 0];

        foreach ($sections as $secCode => $secData) {
            for ($num = 1; $num <= 50; $num++) {
                $code = sprintf('%s-%02d', $secCode, $num);

                if (in_array($code, $reservedSlots)) {
                    $status = 'RESERVED';
                    $notes = 'Under municipal application review';
                } elseif (in_array($code, $restrictedSlots)) {
                    $status = 'RESTRICTED';
                    $notes = 'Expired Permit / Restricted zone';
                } elseif (in_array($code, $availableSlots)) {
                    $status = 'AVAILABLE';
                    $notes = 'Open for new applicant selection';
                } else {
                    $status = 'OCCUPIED';
                    $notes = 'Active registered peddler permit';
                }

                $stats[$status]++;
                $stmt->execute([
                    $code,
                    $secCode,
                    $secData['name'],
                    $num,
                    $status,
                    $notes
                ]);
            }
        }

        echo "Successfully populated 300 market slots!\n";
        echo "Distribution: Occupied: {$stats['OCCUPIED']}, Reserved: {$stats['RESERVED']}, Available: {$stats['AVAILABLE']}, Restricted: {$stats['RESTRICTED']}\n";
    } else {
        echo "Market slots table already has {$count} slots.\n";
    }

    echo "Migration completed successfully!\n";
} catch (Exception $e) {
    echo "Migration Error: " . $e->getMessage() . "\n";
    exit(1);
}
