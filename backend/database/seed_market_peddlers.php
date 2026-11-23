<?php
/**
 * Seed Market Peddlers & Permits for All Occupied Saturday Market Slots
 * Ensures every OCCUPIED stall has a registered peddler vendor, active permit, and applicant record.
 */

require_once dirname(__DIR__) . '/config/Database.php';

try {
    $pdo = Database::getConnection();
    echo "Starting Market Peddler & Permit Seeding for Saturday Market Slots...\n";

    // 1. Realistic Filipino Names Pool
    $firstNamesM = [
        'Juan', 'Jose', 'Pedro', 'Antonio', 'Francisco', 'Manuel', 'Ricardo', 'Eduardo',
        'Roberto', 'Danilo', 'Angelito', 'Rommel', 'Nestor', 'Ramon', 'Gabriel', 'Fernando',
        'Dominador', 'Salvador', 'Renato', 'Felipe', 'Crisanto', 'Ernesto', 'Guillermo', 'Jaime'
    ];
    $firstNamesF = [
        'Maria', 'Elena', 'Teresa', 'Carmela', 'Jocelyn', 'Maricel', 'Susan', 'Rosalinda',
        'Nerissa', 'Gemma', 'Corazon', 'Leticia', 'Rowena', 'Lourdes', 'Divina', 'Imelda',
        'Esperanza', 'Cristina', 'Victoria', 'Amelita', 'Marilou', 'Rosario', 'Fe', 'Luzviminda'
    ];
    $lastNames = [
        'Santos', 'Dela Cruz', 'Bautista', 'Reyes', 'Garcia', 'Mendoza', 'Ramos', 'Flores',
        'Gonzales', 'Lopez', 'Castro', 'Morales', 'Torres', 'Villanueva', 'Fernandez', 'Navarro',
        'Rivera', 'Dizon', 'Aquino', 'Mercado', 'Castillo', 'Manalo', 'Salazar', 'Tolentino',
        'Valdez', 'Pascual', 'Espiritu', 'Agustin', 'Perez', 'Magno', 'Cabrera', 'Serrano',
        'Guzman', 'Soriano', 'Ferrer', 'Padilla', 'Bañez', 'Cordero', 'Palma', 'Montinola'
    ];

    $barangays = [
        'Barangay I (Poblacion)', 'Barangay II (Poblacion)', 'Barangay III (Poblacion)',
        'Ara-al', 'Ayungon', 'Balabag', 'Batuan', 'Cubay', 'Haguimit', 'La Granja',
        'Nagasi', 'San Miguel', 'Yubo'
    ];

    $sectionConfigs = [
        'A' => [
            'name' => 'Vegetables & Spices',
            'nature' => 'Fresh Vegetables & Native Spices',
            'businessSuffix' => 'Vegetable Store',
        ],
        'B' => [
            'name' => 'Fruits',
            'nature' => 'Fresh Local & Seasonal Fruits',
            'businessSuffix' => 'Fruit Stand',
        ],
        'C' => [
            'name' => 'Accessories & RTW',
            'nature' => 'RTW Apparel & Fashion Accessories',
            'businessSuffix' => 'Fashion & RTW',
        ],
        'D' => [
            'name' => 'Thrift Clothes',
            'nature' => 'Thrift Clothes & Ukay-Ukay Apparel',
            'businessSuffix' => 'Boutique & Thrift Store',
        ],
        'E' => [
            'name' => 'Furniture',
            'nature' => 'Handcrafted Bamboo & Wooden Furniture',
            'businessSuffix' => 'Native Furniture',
        ],
        'F' => [
            'name' => 'Flowers',
            'nature' => 'Fresh Cut Flowers & Ornamental Plants',
            'businessSuffix' => 'Flower Garden & Plants',
        ],
    ];

    $pdo->beginTransaction();

    // 2. Fetch all slots that should be OCCUPIED
    $occupiedSlots = $pdo->query("SELECT * FROM market_slots WHERE status = 'OCCUPIED' ORDER BY section_code ASC, slot_number ASC")->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($occupiedSlots) . " OCCUPIED slots in market_slots.\n";

    // Counter for unique peddler codes
    $peddlerSequence = 100;
    $permitSequence = 1000;
    $appSequence = 20000;

    $stmtInsertPeddler = $pdo->prepare("
        INSERT INTO peddlers (
            peddler_code, first_name, last_name, gender, civil_status, phone, email,
            business_nature, business_type, num_employees, num_papag, num_lag_it,
            status, qr_code_token, is_qr_active
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, 'Peddlers', 0, 1, 0,
            'active', ?, 1
        )
    ");

    $stmtInsertApp = $pdo->prepare("
        INSERT INTO permit_applications (
            application_number, peddler_id, application_type, gender, civil_status,
            date_of_application, last_name, first_name, residential_address, residential_barangay,
            residential_city, email, phone, nature_of_business, business_type,
            business_address, business_barangay, business_city, assigned_slot,
            emergency_contact_person, emergency_contact_phone, status, current_stage
        ) VALUES (
            ?, ?, 'New', ?, ?,
            '2026-01-15', ?, ?, ?, ?,
            'La Carlota City', ?, ?, ?, 'Peddlers',
            ?, ?, 'La Carlota City', ?,
            ?, ?, 'FINISHED', 6
        )
    ");

    $stmtInsertPermit = $pdo->prepare("
        INSERT INTO permits (
            permit_number, application_id, peddler_id, business_name, business_location,
            assigned_slot, valid_from, valid_until, qr_code_token, status, released_by_user_id
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, '2026-01-01', '2026-12-31', ?, 'active', 1
        )
    ");

    $stmtUpdateSlot = $pdo->prepare("
        UPDATE market_slots
        SET assigned_peddler_id = ?, assigned_application_id = ?, notes = 'Active registered peddler permit'
        WHERE id = ?
    ");

    $linkedCount = 0;

    foreach ($occupiedSlots as $idx => $slot) {
        $slotCode = $slot['slot_code'];
        $secCode = $slot['section_code'];
        $secConfig = $sectionConfigs[$secCode] ?? $sectionConfigs['A'];

        // Pick gender & name
        $isFemale = ($idx % 2 === 0);
        $gender = $isFemale ? 'Female' : 'Male';
        $firstName = $isFemale
            ? $firstNamesF[$idx % count($firstNamesF)]
            : $firstNamesM[$idx % count($firstNamesM)];
        $lastName = $lastNames[($idx + intval($slot['slot_number'])) % count($lastNames)];
        $brgy = $barangays[$idx % count($barangays)];

        $peddlerSequence++;
        $permitSequence++;
        $appSequence++;

        $peddlerCode = sprintf('PED-2026-%04d', $peddlerSequence);
        $permitNumber = sprintf('PMT-2026-%04d', $permitSequence);
        $appNumber = sprintf('APP-2026-%05d', $appSequence);
        $phone = sprintf('09%d%07d', ($idx % 2 === 0 ? 17 : 18), 1000000 + $idx * 31);
        $email = strtolower(sprintf('%s.%s%d@example.com', str_replace(' ', '', $firstName), str_replace(' ', '', $lastName), $slot['slot_number']));
        $qrToken = 'QR-' . md5($peddlerCode . $slotCode . 'LACARLOTA');

        $businessName = "{$lastName} " . $secConfig['businessSuffix'];
        $businessLocation = "Saturday Market Area - Slot {$slotCode}, Agora Public Market";

        // 1. Insert Peddler
        $stmtInsertPeddler->execute([
            $peddlerCode,
            $firstName,
            $lastName,
            $gender,
            'Married',
            $phone,
            $email,
            $secConfig['nature'],
            $qrToken
        ]);
        $peddlerId = (int)$pdo->lastInsertId();

        // 2. Insert Application
        $stmtInsertApp->execute([
            $appNumber,
            $peddlerId,
            $gender,
            'Married',
            $lastName,
            $firstName,
            "Zone {$slot['slot_number']}, {$brgy}",
            $brgy,
            $email,
            $phone,
            $secConfig['nature'],
            $businessLocation,
            'Barangay I (Poblacion)',
            $slotCode,
            "Spouse: {$firstName} {$lastName}",
            $phone,
        ]);
        $appId = (int)$pdo->lastInsertId();

        // 3. Insert Permit
        $stmtInsertPermit->execute([
            $permitNumber,
            $appId,
            $peddlerId,
            $businessName,
            $businessLocation,
            $slotCode,
            $qrToken
        ]);

        // 4. Update market_slots with assigned peddler and application
        $stmtUpdateSlot->execute([
            $peddlerId,
            $appId,
            $slot['id']
        ]);

        $linkedCount++;
    }

    // 3. For 14 RESERVED slots, ensure pending applications are linked
    $reservedSlots = $pdo->query("SELECT * FROM market_slots WHERE status = 'RESERVED' ORDER BY section_code ASC, slot_number ASC")->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($reservedSlots) . " RESERVED slots. Ensuring pending applications exist...\n";

    $stmtInsertPendingApp = $pdo->prepare("
        INSERT INTO permit_applications (
            application_number, application_type, gender, civil_status,
            date_of_application, last_name, first_name, residential_address, residential_barangay,
            residential_city, email, phone, nature_of_business, business_type,
            business_address, business_barangay, business_city, assigned_slot,
            emergency_contact_person, emergency_contact_phone, status, current_stage
        ) VALUES (
            ?, 'New', ?, 'Single',
            CURDATE(), ?, ?, ?, ?,
            'La Carlota City', ?, ?, ?, 'Peddlers',
            ?, 'Barangay I (Poblacion)', 'La Carlota City', ?,
            ?, ?, ?, ?
        )
    ");

    $pendingStages = [
        ['status' => 'PENDING_ADMIN_APPROVAL', 'stage' => 1],
        ['status' => 'PENDING_INSPECTOR_APPROVAL', 'stage' => 2],
        ['status' => 'PENDING_SANITARY_APPROVAL', 'stage' => 3],
        ['status' => 'PENDING_TREASURY_PAYMENT', 'stage' => 4],
    ];

    foreach ($reservedSlots as $rIdx => $rSlot) {
        $secCode = $rSlot['section_code'];
        $secConfig = $sectionConfigs[$secCode] ?? $sectionConfigs['A'];
        $stageInfo = $pendingStages[$rIdx % count($pendingStages)];

        $rAppNumber = sprintf('APP-2026-REV%03d', $rIdx + 1);
        $rFirst = $firstNamesF[$rIdx % count($firstNamesF)];
        $rLast = $lastNames[($rIdx * 3) % count($lastNames)];
        $rPhone = sprintf('0920%07d', 2000000 + $rIdx * 73);
        $rEmail = strtolower("applicant.{$rFirst}.{$rLast}@example.com");
        $location = "Saturday Market Area - Slot {$rSlot['slot_code']}, Agora Public Market";

        // Check if application already exists for this slot
        $existingApp = $pdo->query("SELECT id FROM permit_applications WHERE assigned_slot = '{$rSlot['slot_code']}' LIMIT 1")->fetchColumn();
        if (!$existingApp) {
            $stmtInsertPendingApp->execute([
                $rAppNumber,
                'Female',
                $rLast,
                $rFirst,
                'Barangay I (Poblacion)',
                'Barangay I (Poblacion)',
                $rEmail,
                $rPhone,
                $secConfig['nature'],
                $location,
                $rSlot['slot_code'],
                "Relative: {$rLast}",
                $rPhone,
                $stageInfo['status'],
                $stageInfo['stage']
            ]);
            $newAppId = (int)$pdo->lastInsertId();
            $pdo->prepare("UPDATE market_slots SET assigned_application_id = ?, notes = 'Application under review' WHERE id = ?")->execute([$newAppId, $rSlot['id']]);
        }
    }

    $pdo->commit();
    echo "SUCCESS: Created and linked registered peddlers and permits for all {$linkedCount} occupied slots!\n";

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
