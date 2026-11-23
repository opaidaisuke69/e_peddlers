<?php
/**
 * Sequential Approval Workflow Controller
 * Stage 1: Admin Approval / Rejection (Web)
 * Stage 2: Inspector Approval / Rejection (Mobile)
 * Stage 3: Sanitary Approval / Rejection (Mobile)
 */

class ApprovalWorkflowController {
    /**
     * STAGE 1: Admin Approval / Rejection (Web Application Only)
     */
    public static function adminDecision(int $applicationId): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'web');
        RoleMiddleware::authorize($user, ['admin']);

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $decision = strtoupper(trim($input['decision'] ?? ''));

        if (!in_array($decision, ['APPROVED', 'REJECTED'])) {
            Response::error('Decision must be either APPROVED or REJECTED.', 422);
        }

        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM permit_applications WHERE id = ? LIMIT 1");
        $stmt->execute([$applicationId]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application not found.', 404);
        }

        if ($app['status'] !== 'PENDING_ADMIN_APPROVAL') {
            Response::error("Application is not awaiting Admin approval (Current status: {$app['status']}).", 400);
        }

        if ($decision === 'REJECTED') {
            $reason = trim($input['reason'] ?? '');
            if (empty($reason)) {
                Response::error('A rejection reason is mandatory when rejecting an application.', 422);
            }

            $pdo->prepare("
                UPDATE permit_applications
                SET status = 'ADMIN_REJECTED', rejection_reason = ?, rejected_by_role = 'Admin', updated_at = NOW()
                WHERE id = ?
            ")->execute([$reason, $applicationId]);

            // Approvals log
            $pdo->prepare("
                INSERT INTO application_approvals (application_id, stage, user_id, decision, remarks)
                VALUES (?, 'ADMIN', ?, 'REJECTED', ?)
            ")->execute([$applicationId, $user['id'], $reason]);

            // History timeline
            $pdo->prepare("
                INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
                VALUES (?, 'Admin Review', 'ADMIN_REJECTED', ?, 'Administrator', ?)
            ")->execute([$applicationId, $user['first_name'] . ' ' . $user['last_name'], "Application rejected: $reason"]);

            // Email
            EmailService::notifyRejected($app, 'City Administrator', $reason);

            // Audit
            Logger::log($user['id'], 'admin', 'APPLICATION_ADMIN_REJECTED', 'permit_applications', (string)$applicationId, [
                'reason' => $reason,
            ]);

            Response::json(['status' => 'ADMIN_REJECTED'], 'Application has been rejected.');
        }

        // --- APPROVED ---
        $pdo->beginTransaction();
        try {
            $peddlerId = $app['peddler_id'];
            $peddlerCode = '';

            // If new applicant, create Peddler Master Record and User Account
            if (!$peddlerId) {
                $peddlerCode = CodeGenerator::generatePeddlerCode($pdo);
                $qrToken = CodeGenerator::generateQrToken($peddlerCode);

                // Insert into peddlers
                $stmtPed = $pdo->prepare("
                    INSERT INTO peddlers (
                        peddler_code, first_name, middle_name, last_name, gender, civil_status, ctc_number,
                        phone, email, business_nature, business_type, num_employees, num_papag, num_lag_it,
                        status, qr_code_token, is_qr_active
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?,
                        'active', ?, 0
                    )
                ");
                $stmtPed->execute([
                    $peddlerCode,
                    $app['first_name'],
                    $app['middle_name'],
                    $app['last_name'],
                    $app['gender'],
                    $app['civil_status'],
                    $app['ctc_number'],
                    $app['phone'],
                    $app['email'],
                    $app['nature_of_business'],
                    $app['business_type'],
                    $app['num_employees'],
                    $app['num_papag'],
                    $app['num_lag_it'],
                    $qrToken,
                ]);
                $peddlerId = (int)$pdo->lastInsertId();

                // Insert address
                $pdo->prepare("
                    INSERT INTO peddler_addresses (peddler_id, residential_address, residential_barangay, residential_city, business_address, business_barangay, business_city)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ")->execute([
                    $peddlerId,
                    $app['residential_address'],
                    $app['residential_barangay'],
                    $app['residential_city'],
                    $app['business_address'],
                    $app['business_barangay'],
                    $app['business_city'],
                ]);

                // Insert emergency contact
                $pdo->prepare("
                    INSERT INTO emergency_contacts (peddler_id, contact_person, contact_phone)
                    VALUES (?, ?, ?)
                ")->execute([
                    $peddlerId,
                    $app['emergency_contact_person'],
                    $app['emergency_contact_phone'],
                ]);

                // Insert QR code record
                $pdo->prepare("
                    INSERT INTO peddler_qr_codes (peddler_id, token, is_active)
                    VALUES (?, ?, 0)
                ")->execute([$peddlerId, $qrToken]);

                // Create or Link User Account for peddler login
                $stmtCheckUser = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
                $stmtCheckUser->execute([$app['email']]);
                $existingUser = $stmtCheckUser->fetch();

                if ($existingUser) {
                    $createdUserId = (int)$existingUser['id'];
                    $pdo->prepare("
                        UPDATE users
                        SET role_id = 5, peddler_id = ?, username = ?, first_name = ?, middle_name = ?, last_name = ?, phone = ?, status = 'active'
                        WHERE id = ?
                    ")->execute([
                        $peddlerCode,
                        strtolower($peddlerCode),
                        $app['first_name'],
                        $app['middle_name'],
                        $app['last_name'],
                        $app['phone'],
                        $createdUserId
                    ]);
                } else {
                    $stmtUser = $pdo->prepare("
                        INSERT INTO users (role_id, peddler_id, username, email, first_name, middle_name, last_name, phone, status)
                        VALUES (5, ?, ?, ?, ?, ?, ?, ?, 'active')
                    ");
                    $stmtUser->execute([
                        $peddlerCode,
                        strtolower($peddlerCode),
                        $app['email'],
                        $app['first_name'],
                        $app['middle_name'],
                        $app['last_name'],
                        $app['phone'],
                    ]);
                    $createdUserId = (int)$pdo->lastInsertId();
                }

                // Link user_id to peddler
                $pdo->prepare("UPDATE peddlers SET user_id = ? WHERE id = ?")->execute([$createdUserId, $peddlerId]);
            } else {
                $stmtExisting = $pdo->prepare("SELECT peddler_code FROM peddlers WHERE id = ?");
                $stmtExisting->execute([$peddlerId]);
                $peddlerCode = $stmtExisting->fetch()['peddler_code'] ?? '';
            }

            // Update Application status -> PENDING_INSPECTOR_APPROVAL
            $pdo->prepare("
                UPDATE permit_applications
                SET peddler_id = ?, status = 'PENDING_INSPECTOR_APPROVAL', current_stage = 2, rejection_reason = NULL, updated_at = NOW()
                WHERE id = ?
            ")->execute([$peddlerId, $applicationId]);

            // Approvals log
            $pdo->prepare("
                INSERT INTO application_approvals (application_id, stage, user_id, decision, remarks)
                VALUES (?, 'ADMIN', ?, 'APPROVED', 'Initial application reviewed and approved. Forwarded to Field Inspector.')
            ")->execute([$applicationId, $user['id']]);

            // History timeline
            $pdo->prepare("
                INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
                VALUES (?, 'Admin Approval', 'PENDING_INSPECTOR_APPROVAL', ?, 'Administrator', ?)
            ")->execute([
                $applicationId,
                $user['first_name'] . ' ' . $user['last_name'],
                "Approved and Peddler ID {$peddlerCode} assigned. Forwarded to Field Inspector for compliance verification."
            ]);

            $pdo->commit();

            // Send notification email to applicant
            EmailService::notifyAdminApproved($app, $peddlerCode);

            // Real-time broadcast to Inspector
            SocketService::emit('inspector_approval_pending', [
                'title' => 'New Inspection Queued',
                'message' => "Application {$app['application_number']} ({$app['first_name']} {$app['last_name']}) is ready for field inspection.",
                'reference_id' => $app['application_number'],
                'type' => 'info',
            ], 'inspector');

            Logger::log($user['id'], 'admin', 'APPLICATION_ADMIN_APPROVED', 'permit_applications', (string)$applicationId, [
                'peddler_code' => $peddlerCode,
            ]);

            Response::json([
                'status' => 'PENDING_INSPECTOR_APPROVAL',
                'peddler_code' => $peddlerCode,
                'message' => 'Application approved by Admin and forwarded to Inspector.',
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Failed to process approval: ' . $e->getMessage(), 500);
        }
    }

    /**
     * STAGE 2: Inspector Approval / Rejection (Mobile Application Only)
     */
    public static function inspectorDecision(int $applicationId): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'mobile');
        RoleMiddleware::authorize($user, ['inspector']);

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $decision = strtoupper(trim($input['decision'] ?? ''));

        if (!in_array($decision, ['APPROVED', 'REJECTED'])) {
            Response::error('Decision must be either APPROVED or REJECTED.', 422);
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM permit_applications WHERE id = ? LIMIT 1");
        $stmt->execute([$applicationId]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application not found.', 404);
        }

        if ($app['status'] !== 'PENDING_INSPECTOR_APPROVAL') {
            Response::error("Application is not awaiting Inspector review (Current status: {$app['status']}).", 400);
        }

        $remarks = trim($input['remarks'] ?? '');

        if ($decision === 'REJECTED') {
            if (empty($remarks)) {
                Response::error('Rejection remarks are mandatory for failed inspection.', 422);
            }

            $pdo->prepare("
                UPDATE permit_applications
                SET status = 'INSPECTOR_REJECTED', rejection_reason = ?, rejected_by_role = 'Inspector', updated_at = NOW()
                WHERE id = ?
            ")->execute([$remarks, $applicationId]);

            $pdo->prepare("
                INSERT INTO application_approvals (application_id, stage, user_id, decision, remarks)
                VALUES (?, 'INSPECTOR', ?, 'REJECTED', ?)
            ")->execute([$applicationId, $user['id'], $remarks]);

            $pdo->prepare("
                INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
                VALUES (?, 'Field Inspection', 'INSPECTOR_REJECTED', ?, 'Field Inspector', ?)
            ")->execute([$applicationId, $user['first_name'] . ' ' . $user['last_name'], "Inspection failed: $remarks"]);

            EmailService::notifyRejected($app, 'Field Inspector', $remarks);

            Logger::log($user['id'], 'inspector', 'APPLICATION_INSPECTOR_REJECTED', 'permit_applications', (string)$applicationId, [
                'remarks' => $remarks,
            ], 'mobile');

            Response::json(['status' => 'INSPECTOR_REJECTED'], 'Inspection rejected and returned to applicant.');
        }

        // --- APPROVED ---
        $pdo->prepare("
            UPDATE permit_applications
            SET status = 'PENDING_SANITARY_APPROVAL', current_stage = 3, rejection_reason = NULL, updated_at = NOW()
            WHERE id = ?
        ")->execute([$applicationId]);

        $inspectorRemarks = !empty($remarks) ? $remarks : 'Price tag, sample products, and barangay clearance validated successfully.';

        $pdo->prepare("
            INSERT INTO application_approvals (application_id, stage, user_id, decision, remarks)
            VALUES (?, 'INSPECTOR', ?, 'APPROVED', ?)
        ")->execute([$applicationId, $user['id'], $inspectorRemarks]);

        $pdo->prepare("
            INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
            VALUES (?, 'Field Inspection', 'PENDING_SANITARY_APPROVAL', ?, 'Field Inspector', ?)
        ")->execute([$applicationId, $user['first_name'] . ' ' . $user['last_name'], $inspectorRemarks]);

        EmailService::notifyInspectorApproved($app);

        // Realtime notification to Sanitary
        SocketService::emit('sanitary_approval_pending', [
            'title' => 'Sanitary Review Required',
            'message' => "Application {$app['application_number']} has passed field inspection and is ready for sanitary review.",
            'reference_id' => $app['application_number'],
            'type' => 'info',
        ], 'sanitary');

        Logger::log($user['id'], 'inspector', 'APPLICATION_INSPECTOR_APPROVED', 'permit_applications', (string)$applicationId, [
            'remarks' => $inspectorRemarks,
        ], 'mobile');

        Response::json([
            'status' => 'PENDING_SANITARY_APPROVAL',
            'message' => 'Inspection approved. Application forwarded to Sanitary.',
        ]);
    }

    /**
     * STAGE 3: Sanitary Approval / Rejection (Mobile Application Only)
     */
    public static function sanitaryDecision(int $applicationId): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'mobile');
        RoleMiddleware::authorize($user, ['sanitary']);

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $decision = strtoupper(trim($input['decision'] ?? ''));

        if (!in_array($decision, ['APPROVED', 'REJECTED'])) {
            Response::error('Decision must be either APPROVED or REJECTED.', 422);
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM permit_applications WHERE id = ? LIMIT 1");
        $stmt->execute([$applicationId]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application not found.', 404);
        }

        if ($app['status'] !== 'PENDING_SANITARY_APPROVAL') {
            Response::error("Application is not awaiting Sanitary review (Current status: {$app['status']}).", 400);
        }

        $remarks = trim($input['remarks'] ?? '');

        if ($decision === 'REJECTED') {
            if (empty($remarks)) {
                Response::error('Rejection explanation is mandatory for sanitary non-compliance.', 422);
            }

            $pdo->prepare("
                UPDATE permit_applications
                SET status = 'SANITARY_REJECTED', rejection_reason = ?, rejected_by_role = 'Sanitary', updated_at = NOW()
                WHERE id = ?
            ")->execute([$remarks, $applicationId]);

            $pdo->prepare("
                INSERT INTO application_approvals (application_id, stage, user_id, decision, remarks)
                VALUES (?, 'SANITARY', ?, 'REJECTED', ?)
            ")->execute([$applicationId, $user['id'], $remarks]);

            $pdo->prepare("
                INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
                VALUES (?, 'Sanitary Inspection', 'SANITARY_REJECTED', ?, 'Sanitary Inspector', ?)
            ")->execute([$applicationId, $user['first_name'] . ' ' . $user['last_name'], "Sanitary non-compliance: $remarks"]);

            EmailService::notifyRejected($app, 'City Health / Sanitary Inspector', $remarks);

            Logger::log($user['id'], 'sanitary', 'APPLICATION_SANITARY_REJECTED', 'permit_applications', (string)$applicationId, [
                'remarks' => $remarks,
            ], 'mobile');

            Response::json(['status' => 'SANITARY_REJECTED'], 'Sanitary compliance rejected.');
        }

        // --- APPROVED ---
        $pdo->prepare("
            UPDATE permit_applications
            SET status = 'PENDING_TREASURY_PAYMENT', current_stage = 4, rejection_reason = NULL, updated_at = NOW()
            WHERE id = ?
        ")->execute([$applicationId]);

        $sanitaryRemarks = !empty($remarks) ? $remarks : 'Sanitary clearance and food/health standards approved.';

        $pdo->prepare("
            INSERT INTO application_approvals (application_id, stage, user_id, decision, remarks)
            VALUES (?, 'SANITARY', ?, 'APPROVED', ?)
        ")->execute([$applicationId, $user['id'], $sanitaryRemarks]);

        $pdo->prepare("
            INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
            VALUES (?, 'Sanitary Inspection', 'PENDING_TREASURY_PAYMENT', ?, 'Sanitary Inspector', ?)
        ")->execute([$applicationId, $user['first_name'] . ' ' . $user['last_name'], $sanitaryRemarks]);

        EmailService::notifySanitaryApproved($app);

        // Realtime notification to Treasury
        SocketService::emit('treasury_payment_pending', [
            'title' => 'Permit Payment Pending',
            'message' => "Application {$app['application_number']} approved by Sanitary. Ready for Treasury payment.",
            'reference_id' => $app['application_number'],
            'type' => 'info',
        ], 'treasury');

        Logger::log($user['id'], 'sanitary', 'APPLICATION_SANITARY_APPROVED', 'permit_applications', (string)$applicationId, [
            'remarks' => $sanitaryRemarks,
        ], 'mobile');

        Response::json([
            'status' => 'PENDING_TREASURY_PAYMENT',
            'message' => 'Sanitary inspection approved. Forwarded to Treasury for payment.',
        ]);
    }
}
