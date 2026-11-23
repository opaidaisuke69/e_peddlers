<?php
/**
 * Permit Release Controller
 * Stage 5: Final Admin Permit Release, digital permit generation, QR code activation,
 * and printable document delivery.
 */

class PermitReleaseController {
    /**
     * Admin: Release Official Permit (Web Application Only)
     */
    public static function releasePermit(int $applicationId): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'web');
        RoleMiddleware::authorize($user, ['admin']);

        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT pa.*, p.id AS peddler_id, p.peddler_code, p.qr_code_token, p.is_qr_active
            FROM permit_applications pa
            LEFT JOIN peddlers p ON pa.peddler_id = p.id
            WHERE pa.id = ?
            LIMIT 1
        ");
        $stmt->execute([$applicationId]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application not found.', 404);
        }

        if ($app['status'] !== 'READY_FOR_PERMIT_RELEASE') {
            Response::error("Application is not ready for permit release (Current status: {$app['status']}).", 400);
        }

        if (empty($app['peddler_id'])) {
            Response::error('Application is missing an assigned Peddler ID.', 400);
        }

        $pdo->beginTransaction();
        try {
            $permitNumber = CodeGenerator::generatePermitNumber($pdo);

            // Municipal Permit Calendar Year Duration: January 1 to December 31
            // All permits are valid within the year of issuance, expiring on December 31.
            $appDate = !empty($app['date_of_application']) ? $app['date_of_application'] : date('Y-m-d');
            $validityYear = (int)date('Y', strtotime($appDate));
            $validUntil = "{$validityYear}-12-31";
            $validFrom = ($app['application_type'] === 'Renewal') ? "{$validityYear}-01-01" : date('Y-m-d');

            // If renewal, mark previous active permits for this peddler as expired
            if ($app['application_type'] === 'Renewal') {
                $pdo->prepare("
                    UPDATE permits
                    SET status = 'expired'
                    WHERE peddler_id = ? AND status = 'active'
                ")->execute([$app['peddler_id']]);
            }

            // Insert into permits
            $stmtPermit = $pdo->prepare("
                INSERT INTO permits (permit_number, application_id, peddler_id, business_name, business_location, assigned_slot, valid_from, valid_until, qr_code_token, status, released_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
            ");
            $fullLocation = $app['business_address'] . ', ' . $app['business_barangay'] . ', ' . $app['business_city'];
            $stmtPermit->execute([
                $permitNumber,
                $applicationId,
                $app['peddler_id'],
                $app['nature_of_business'],
                $fullLocation,
                $app['assigned_slot'] ?? null,
                $validFrom,
                $validUntil,
                $app['qr_code_token'],
                $user['id'],
            ]);
            $permitId = (int)$pdo->lastInsertId();

            // If slot assigned, update market_slots to OCCUPIED
            if (!empty($app['assigned_slot'])) {
                $pdo->prepare("
                    UPDATE market_slots
                    SET status = 'OCCUPIED', assigned_peddler_id = ?, notes = ?
                    WHERE slot_code = ?
                ")->execute([$app['peddler_id'], "Permit Issued: {$permitNumber}", $app['assigned_slot']]);
            }

            // Insert permit validity log
            $pdo->prepare("
                INSERT INTO permit_validity (permit_id, start_date, end_date, extended_months, extension_reason)
                VALUES (?, ?, ?, ?, ?)
            ")->execute([
                $permitId,
                $validFrom,
                $validUntil,
                $app['application_type'] === 'Renewal' ? 1 : 12,
                $app['application_type'] === 'Renewal' ? 'Permit Renewal Extension' : 'New Permit Release',
            ]);

            // Activate Peddler QR code
            $pdo->prepare("UPDATE peddlers SET is_qr_active = 1, status = 'active' WHERE id = ?")->execute([$app['peddler_id']]);
            $pdo->prepare("UPDATE peddler_qr_codes SET is_active = 1 WHERE peddler_id = ?")->execute([$app['peddler_id']]);

            // Update application status to FINISHED
            $pdo->prepare("
                UPDATE permit_applications
                SET status = 'FINISHED', current_stage = 6, updated_at = NOW()
                WHERE id = ?
            ")->execute([$applicationId]);

            // Log approval
            $pdo->prepare("
                INSERT INTO application_approvals (application_id, stage, user_id, decision, remarks)
                VALUES (?, 'PERMIT_RELEASE', ?, 'APPROVED', ?)
            ")->execute([$applicationId, $user['id'], "Official Permit {$permitNumber} generated and released."]);

            // Timeline history
            $pdo->prepare("
                INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
                VALUES (?, 'Permit Release', 'FINISHED', ?, 'Administrator', ?)
            ")->execute([
                $applicationId,
                $user['first_name'] . ' ' . $user['last_name'],
                "Peddler Permit Verification Proof {$permitNumber} released. Peddler Arkabala QR Code is now ACTIVATED."
            ]);

            $pdo->commit();

            // Send congratulatory email
            EmailService::notifyPermitReleased($app, $permitNumber);

            // Socket notification to Peddler & Swarm
            SocketService::emit('permit_released', [
                'title' => 'Permit Officially Released!',
                'message' => "Permit {$permitNumber} has been issued to {$app['first_name']} {$app['last_name']}.",
                'reference_id' => $permitNumber,
                'type' => 'success',
            ], 'peddler');

            Logger::log($user['id'], 'admin', 'PERMIT_RELEASED', 'permits', (string)$permitId, [
                'permit_number' => $permitNumber,
                'application_id' => $applicationId,
            ]);

            Response::json([
                'permit_id' => $permitId,
                'permit_number' => $permitNumber,
                'status' => 'FINISHED',
                'valid_from' => $validFrom,
                'valid_until' => $validUntil,
                'qr_token' => $app['qr_code_token'],
                'message' => 'Official permit successfully released and QR code activated.',
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Failed to release permit: ' . $e->getMessage(), 500);
        }
    }

    /**
     * View / Print / Download Official Permit Document
     */
    public static function viewPermit(int $permitId): void {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT pm.*, p.peddler_code, p.first_name, p.middle_name, p.last_name, p.num_papag, p.num_lag_it,
                   u.first_name AS released_by_first_name, u.last_name AS released_by_last_name
            FROM permits pm
            JOIN peddlers p ON pm.peddler_id = p.id
            JOIN users u ON pm.released_by_user_id = u.id
            WHERE pm.id = ? OR pm.application_id = ?
            LIMIT 1
        ");
        $stmt->execute([$permitId, $permitId]);
        $permit = $stmt->fetch();

        if (!$permit) {
            Response::error('Permit document not found.', 404);
        }

        $permit['released_by_name'] = $permit['released_by_first_name'] . ' ' . $permit['released_by_last_name'];
        $html = PdfService::generatePermitHtml($permit);

        header('Content-Type: text/html; charset=utf-8');
        echo $html;
        exit;
    }

    /**
     * Download or View Peddler QR Code
     * Supports both integer ID and Peddler Code string (e.g. PED-2026-0013)
     */
    public static function getQrCode($peddlerId): void {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT p.*, pq.token, pq.is_active AS qr_active,
                   pa.residential_address, pa.residential_barangay, pa.business_address, pa.business_barangay,
                   pm.permit_number, pm.issued_at, pm.expires_at
            FROM peddlers p
            LEFT JOIN peddler_qr_codes pq ON p.id = pq.peddler_id
            LEFT JOIN peddler_addresses pa ON p.id = pa.peddler_id
            LEFT JOIN permits pm ON p.id = pm.peddler_id
            WHERE p.id = ? OR p.peddler_code = ?
            ORDER BY pm.id DESC, pq.id DESC
            LIMIT 1
        ");
        $stmt->execute([is_numeric($peddlerId) ? (int)$peddlerId : 0, (string)$peddlerId]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Peddler or QR code record not found.', 404);
        }

        $qrToken = !empty($row['token']) ? $row['token'] : (!empty($row['qr_code_token']) ? $row['qr_code_token'] : null);
        if (!$qrToken) {
            $qrToken = 'QR-' . $row['peddler_code'] . '-TOKEN-' . strtoupper(substr(md5($row['peddler_code'] . 'epeddlers'), 0, 16));
            try {
                $pdo->prepare("UPDATE peddlers SET qr_code_token = ?, is_qr_active = 1 WHERE id = ?")->execute([$qrToken, $row['id']]);
            } catch (\Throwable $e) {}
        }

        $qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" . urlencode($qrToken);

        Response::json([
            'peddler_id' => $row['id'],
            'peddler_code' => $row['peddler_code'],
            'peddler_id_code' => $row['peddler_code'],
            'peddler_name' => trim($row['first_name'] . ' ' . ($row['middle_name'] ?? '') . ' ' . $row['last_name']),
            'business_name' => $row['business_nature'],
            'barangay' => $row['business_barangay'] ?? $row['residential_barangay'] ?? 'Agora Public Market',
            'permit_number' => $row['permit_number'] ?? 'PERMIT-' . date('Y') . '-' . str_pad((string)$row['id'], 5, '0', STR_PAD_LEFT),
            'papag_count' => (int)$row['num_papag'],
            'lag_it_count' => (int)$row['num_lag_it'],
            'qr_token' => $qrToken,
            'qr_image' => $qrImageUrl,
            'qr_image_url' => $qrImageUrl,
            'is_active' => true,
            'business_nature' => $row['business_nature'],
        ], 'QR code details retrieved.');
    }
}
