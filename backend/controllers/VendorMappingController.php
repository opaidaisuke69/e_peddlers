<?php
/**
 * VendorMappingController
 * Manages Saturday Market 300 Slots, availability, admin slot management, and real-time synchronization.
 */

class VendorMappingController {

    public static function getSlots(): void {
        $pdo = Database::getConnection();

        // 1. Fetch all slots
        $stmt = $pdo->query("SELECT * FROM market_slots ORDER BY section_code ASC, slot_number ASC");
        $rawSlots = $stmt->fetchAll();

        // 2. Fetch pending applications that have an assigned slot
        $stmtApps = $pdo->query("
            SELECT id, application_number, assigned_slot, first_name, last_name, nature_of_business, status
            FROM permit_applications
            WHERE assigned_slot IS NOT NULL
              AND assigned_slot != ''
              AND status NOT IN ('ADMIN_REJECTED', 'INSPECTOR_REJECTED', 'SANITARY_REJECTED', 'PAYMENT_REJECTED', 'FINISHED')
        ");
        $pendingAppsBySlot = [];
        while ($row = $stmtApps->fetch()) {
            $pendingAppsBySlot[$row['assigned_slot']] = $row;
        }

        // 3. Fetch active permits with assigned slot
        $stmtPermits = $pdo->query("
            SELECT p.id, p.permit_number, p.assigned_slot, p.business_name, p.status,
                   ped.id AS peddler_id, ped.peddler_code, ped.first_name, ped.last_name, ped.phone
            FROM permits p
            JOIN peddlers ped ON p.peddler_id = ped.id
            WHERE p.assigned_slot IS NOT NULL
              AND p.assigned_slot != ''
              AND p.status = 'active'
        ");
        $activePermitsBySlot = [];
        while ($row = $stmtPermits->fetch()) {
            $activePermitsBySlot[$row['assigned_slot']] = $row;
        }

        // 4. Pre-fetch registered peddlers (in case directly assigned in market_slots)
        $stmtDirectPeddlers = $pdo->query("
            SELECT id, peddler_code, first_name, last_name, phone, business_nature AS nature_of_business
            FROM peddlers
        ");
        $directPeddlersById = [];
        while ($row = $stmtDirectPeddlers->fetch()) {
            $directPeddlersById[$row['id']] = $row;
        }

        $stats = [
            'total' => 0,
            'occupied' => 0,
            'reserved' => 0,
            'available' => 0,
            'restricted' => 0,
        ];

        $sectionsConfig = [
            'A' => ['name' => 'Vegetable & Spices', 'range' => 'A-01 – A-50', 'theme' => 'emerald', 'headerColor' => '#15803d'],
            'B' => ['name' => 'Fruits', 'range' => 'B-01 – B-50', 'theme' => 'amber', 'headerColor' => '#d97706'],
            'C' => ['name' => 'Accessories & RTW', 'range' => 'C-01 – C-50', 'theme' => 'blue', 'headerColor' => '#1d4ed8'],
            'D' => ['name' => 'Thrift Clothes', 'range' => 'D-01 – D-50', 'theme' => 'purple', 'headerColor' => '#6d28d9'],
            'E' => ['name' => 'Furniture', 'range' => 'E-01 – E-50', 'theme' => 'teal', 'headerColor' => '#047857'],
            'F' => ['name' => 'Flowers', 'range' => 'F-01 – F-50', 'theme' => 'rose', 'headerColor' => '#be185d'],
        ];

        $sections = [];
        foreach ($sectionsConfig as $secKey => $cfg) {
            $sections[$secKey] = [
                'code' => $secKey,
                'name' => $cfg['name'],
                'range' => $cfg['range'],
                'theme' => $cfg['theme'],
                'headerColor' => $cfg['headerColor'],
                'slots' => [],
            ];
        }

        $processedSlots = [];

        foreach ($rawSlots as $slot) {
            $code = $slot['slot_code'];
            $sec = $slot['section_code'];
            $dbStatus = $slot['status'];
            $occupant = null;

            // Determine status & occupant priority:
            if ($dbStatus === 'RESTRICTED') {
                $status = 'RESTRICTED';
            } elseif ($dbStatus === 'AVAILABLE') {
                $status = 'AVAILABLE';
            } elseif (isset($activePermitsBySlot[$code])) {
                $status = 'OCCUPIED';
                $p = $activePermitsBySlot[$code];
                $occupant = [
                    'type' => 'permit',
                    'peddler_id' => $p['peddler_id'],
                    'peddler_code' => $p['peddler_code'],
                    'name' => trim($p['first_name'] . ' ' . $p['last_name']),
                    'phone' => $p['phone'] ?? '',
                    'business' => $p['business_name'],
                    'permit_number' => $p['permit_number'],
                ];
            } elseif (!empty($slot['assigned_peddler_id']) && isset($directPeddlersById[$slot['assigned_peddler_id']])) {
                $status = 'OCCUPIED';
                $ped = $directPeddlersById[$slot['assigned_peddler_id']];
                $occupant = [
                    'type' => 'peddler',
                    'peddler_id' => $ped['id'],
                    'peddler_code' => $ped['peddler_code'],
                    'name' => trim($ped['first_name'] . ' ' . $ped['last_name']),
                    'phone' => $ped['phone'] ?? '',
                    'business' => $ped['nature_of_business'],
                ];
            } elseif (isset($pendingAppsBySlot[$code])) {
                $status = 'RESERVED';
                $app = $pendingAppsBySlot[$code];
                $occupant = [
                    'type' => 'application',
                    'application_number' => $app['application_number'],
                    'applicant' => trim($app['first_name'] . ' ' . $app['last_name']),
                    'business' => $app['nature_of_business'],
                    'status' => $app['status'],
                ];
            } else {
                $status = $dbStatus;
            }

            $stats['total']++;
            $statusKey = strtolower($status);
            if (isset($stats[$statusKey])) {
                $stats[$statusKey]++;
            }

            $slotData = [
                'id' => (int)$slot['id'],
                'slot_code' => $code,
                'section_code' => $sec,
                'section_name' => $slot['section_name'],
                'slot_number' => (int)$slot['slot_number'],
                'status' => $status,
                'notes' => $slot['notes'] ?? '',
                'assigned_peddler_id' => $slot['assigned_peddler_id'] ? (int)$slot['assigned_peddler_id'] : null,
                'occupant' => $occupant,
                'updated_at' => $slot['updated_at'] ?? null,
            ];

            $processedSlots[] = $slotData;
            if (isset($sections[$sec])) {
                $sections[$sec]['slots'][] = $slotData;
            }
        }

        Response::json([
            'stats' => $stats,
            'sections' => $sections,
            'slots' => $processedSlots,
        ]);
    }

    /**
     * Admin: Update Single Market Slot
     */
    public static function updateSlot(int $id): void {
        $user = AuthMiddleware::authenticate();
        $role = strtolower($user['role_name'] ?? '');

        if ($role !== 'admin') {
            Response::error('Unauthorized. Only administrators can manage market stall allocations.', 403);
        }

        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM market_slots WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $slot = $stmt->fetch();

        if (!$slot) {
            Response::error('Market stall slot not found.', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $newStatus = strtoupper(trim($input['status'] ?? $slot['status']));
        $validStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'RESTRICTED'];
        if (!in_array($newStatus, $validStatuses)) {
            Response::error('Invalid status value. Allowed: AVAILABLE, OCCUPIED, RESERVED, RESTRICTED.', 400);
        }

        $notes = isset($input['notes']) ? trim($input['notes']) : $slot['notes'];
        $assignedPeddlerId = isset($input['assigned_peddler_id']) && $input['assigned_peddler_id'] !== ''
            ? (int)$input['assigned_peddler_id']
            : null;
        $vacateOccupant = !empty($input['vacate_occupant']);

        $pdo->beginTransaction();
        try {
            $slotCode = $slot['slot_code'];

            if ($newStatus === 'AVAILABLE' || $vacateOccupant) {
                $newStatus = 'AVAILABLE';
                $assignedPeddlerId = null;

                // Release unlinked permits or applications that referenced this slot
                $pdo->prepare("UPDATE permits SET assigned_slot = NULL WHERE assigned_slot = ?")->execute([$slotCode]);
                $pdo->prepare("UPDATE permit_applications SET assigned_slot = NULL WHERE assigned_slot = ? AND status NOT IN ('FINISHED', 'ADMIN_REJECTED')")->execute([$slotCode]);

                $stmtUp = $pdo->prepare("
                    UPDATE market_slots 
                    SET status = 'AVAILABLE', assigned_peddler_id = NULL, assigned_application_id = NULL, notes = ?
                    WHERE id = ?
                ");
                $stmtUp->execute([$notes, $id]);
            } elseif ($newStatus === 'OCCUPIED') {
                if ($assignedPeddlerId) {
                    $stmtPed = $pdo->prepare("SELECT id, peddler_code, first_name, last_name FROM peddlers WHERE id = ?");
                    $stmtPed->execute([$assignedPeddlerId]);
                    $ped = $stmtPed->fetch();
                    if (!$ped) {
                        Response::error('Selected peddler not found in system.', 404);
                    }

                    // Update peddler's active permit to hold this slot
                    $pdo->prepare("UPDATE permits SET assigned_slot = ? WHERE peddler_id = ? AND status = 'active'")->execute([$slotCode, $assignedPeddlerId]);

                    $stmtUp = $pdo->prepare("
                        UPDATE market_slots 
                        SET status = 'OCCUPIED', assigned_peddler_id = ?, notes = ?
                        WHERE id = ?
                    ");
                    $stmtUp->execute([$assignedPeddlerId, $notes, $id]);
                } else {
                    $stmtUp = $pdo->prepare("
                        UPDATE market_slots 
                        SET status = 'OCCUPIED', notes = ?
                        WHERE id = ?
                    ");
                    $stmtUp->execute([$notes, $id]);
                }
            } elseif ($newStatus === 'RESTRICTED') {
                // If restricted, remove pending applicant claims
                $pdo->prepare("UPDATE permit_applications SET assigned_slot = NULL WHERE assigned_slot = ? AND status NOT IN ('FINISHED')")->execute([$slotCode]);

                $stmtUp = $pdo->prepare("
                    UPDATE market_slots 
                    SET status = 'RESTRICTED', notes = ?
                    WHERE id = ?
                ");
                $stmtUp->execute([$notes, $id]);
            } else {
                // RESERVED
                $stmtUp = $pdo->prepare("
                    UPDATE market_slots 
                    SET status = 'RESERVED', notes = ?
                    WHERE id = ?
                ");
                $stmtUp->execute([$notes, $id]);
            }

            Logger::log(
                $user['id'],
                $user['role_name'],
                'MARKET_SLOT_UPDATED',
                'market_slots',
                (string)$id,
                [
                    'slot_code' => $slotCode,
                    'old_status' => $slot['status'],
                    'new_status' => $newStatus,
                    'notes' => $notes,
                    'assigned_peddler_id' => $assignedPeddlerId,
                ]
            );

            $pdo->commit();

            Response::json([
                'id' => $id,
                'slot_code' => $slotCode,
                'status' => $newStatus,
                'notes' => $notes,
            ], "Market stall {$slotCode} updated successfully.");
        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Failed to update market stall: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Admin: Batch Update Market Slots (e.g. by section or range)
     */
    public static function batchUpdate(): void {
        $user = AuthMiddleware::authenticate();
        $role = strtolower($user['role_name'] ?? '');

        if ($role !== 'admin') {
            Response::error('Unauthorized. Only administrators can perform batch stall updates.', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $slotCodes = $input['slot_codes'] ?? [];
        $newStatus = strtoupper(trim($input['status'] ?? ''));
        $notes = isset($input['notes']) ? trim($input['notes']) : null;

        if (empty($slotCodes) || !is_array($slotCodes)) {
            Response::error('Please provide an array of slot_codes to update.', 400);
        }

        $validStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'RESTRICTED'];
        if (!in_array($newStatus, $validStatuses)) {
            Response::error('Invalid status value. Allowed: AVAILABLE, OCCUPIED, RESERVED, RESTRICTED.', 400);
        }

        $pdo = Database::getConnection();
        $pdo->beginTransaction();
        try {
            $updatedCount = 0;
            foreach ($slotCodes as $code) {
                $code = strtoupper(trim($code));
                if (empty($code)) continue;

                if ($newStatus === 'AVAILABLE') {
                    $pdo->prepare("
                        UPDATE market_slots 
                        SET status = 'AVAILABLE', assigned_peddler_id = NULL, assigned_application_id = NULL,
                            notes = COALESCE(?, notes)
                        WHERE slot_code = ?
                    ")->execute([$notes, $code]);
                } else {
                    $pdo->prepare("
                        UPDATE market_slots 
                        SET status = ?, notes = COALESCE(?, notes)
                        WHERE slot_code = ?
                    ")->execute([$newStatus, $notes, $code]);
                }
                $updatedCount++;
            }

            Logger::log(
                $user['id'],
                $user['role_name'],
                'MARKET_SLOTS_BATCH_UPDATED',
                'market_slots',
                implode(',', array_slice($slotCodes, 0, 10)),
                [
                    'count' => $updatedCount,
                    'new_status' => $newStatus,
                    'notes' => $notes,
                ]
            );

            $pdo->commit();
            Response::json(['updated_count' => $updatedCount], "Successfully updated {$updatedCount} stall slots to {$newStatus}.");
        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Batch update failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Admin: Get Registered Peddlers for Stall Assignment Dropdown
     */
    public static function getPeddlers(): void {
        $user = AuthMiddleware::authenticate();
        $role = strtolower($user['role_name'] ?? '');

        if (!in_array($role, ['admin', 'inspector', 'treasury'])) {
            Response::error('Unauthorized.', 403);
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->query("
            SELECT p.id, p.peddler_code, p.first_name, p.last_name, p.phone, p.business_nature AS nature_of_business,
                   pm.permit_number, pm.assigned_slot
            FROM peddlers p
            LEFT JOIN permits pm ON pm.id = (
                SELECT id FROM permits WHERE peddler_id = p.id AND status = 'active' ORDER BY id DESC LIMIT 1
            )
            ORDER BY p.last_name ASC, p.first_name ASC
            LIMIT 300
        ");
        $peddlers = $stmt->fetchAll();

        Response::json($peddlers, 'Peddlers retrieved for stall management.');
    }
}
