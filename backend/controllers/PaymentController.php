<?php
/**
 * Payment and Treasury Controller
 * Handles fee breakdowns, Cash payments at Treasury, PayMongo QRPh (TEST MODE),
 * PayMongo webhooks, and Treasury payment verification.
 */

class PaymentController {
    /**
     * Get Fee Breakdown for an Application
     */
    public static function getFeeBreakdown(int $applicationId): void {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT pa.*, fs.fee_breakdown, fs.subtotal, fs.penalty_amount, fs.total_amount
            FROM permit_applications pa
            LEFT JOIN fee_snapshots fs ON pa.id = fs.application_id
            WHERE pa.id = ?
            LIMIT 1
        ");
        $stmt->execute([$applicationId]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application not found.', 404);
        }

        // If snapshot exists, return it
        if (!empty($app['fee_breakdown'])) {
            $breakdown = json_decode($app['fee_breakdown'], true);
            Response::json([
                'application_id' => $app['id'],
                'application_number' => $app['application_number'],
                'items' => $breakdown,
                'subtotal' => (float)$app['subtotal'],
                'penalty_amount' => (float)$app['penalty_amount'],
                'total_amount' => (float)$app['total_amount'],
                'formatted_total' => '₱' . number_format($app['total_amount'], 2),
            ], 'Fee breakdown retrieved.');
        }

        // Otherwise compute fresh
        $numPapag = (int)$app['num_papag'];
        $numLagIt = (int)$app['num_lag_it'];
        $isLate = !empty($app['is_late_renewal']);
        $calc = FeeCalculatorService::calculate($numPapag, $numLagIt, $isLate);

        Response::json($calc, 'Fee calculation computed.');
    }

    /**
     * Create PayMongo QRPh Payment Intent (Online Payment in TEST MODE)
     */
    public static function createPayMongoQrPh(int $applicationId): void {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT pa.*, fs.total_amount
            FROM permit_applications pa
            LEFT JOIN fee_snapshots fs ON pa.id = fs.application_id
            WHERE pa.id = ?
            LIMIT 1
        ");
        $stmt->execute([$applicationId]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application not found.', 404);
        }

        $amount = (float)($app['total_amount'] ?? 0);
        if ($amount <= 0) {
            $calc = FeeCalculatorService::calculate((int)$app['num_papag'], (int)$app['num_lag_it'], !empty($app['is_late_renewal']));
            $amount = $calc['total_amount'];
        }

        $service = new PayMongoService();
        $desc = "Permit Fee - {$app['application_number']} - {$app['first_name']} {$app['last_name']}";
        $result = $service->createQrPhPayment($amount, $desc, [
            'application_id' => $app['id'],
            'application_number' => $app['application_number'],
            'peddler_name' => $app['first_name'] . ' ' . $app['last_name'],
        ]);

        // Insert or update permit_payments record
        $stmtPay = $pdo->prepare("
            INSERT INTO permit_payments (application_id, payment_method, amount_due, amount_paid, status)
            VALUES (?, 'PAYMONGO_QRPH', ?, 0.00, 'PENDING')
            ON DUPLICATE KEY UPDATE payment_method = 'PAYMONGO_QRPH', amount_due = VALUES(amount_due), status = 'PENDING'
        ");
        $stmtPay->execute([$applicationId, $amount]);
        $paymentId = (int)$pdo->lastInsertId();

        // Record transaction
        $pdo->prepare("
            INSERT INTO payment_transactions (payment_id, transaction_number, gateway, paymongo_payment_intent_id, paymongo_qr_url, raw_status, amount, payload)
            VALUES (?, ?, 'PAYMONGO', ?, ?, 'awaiting_payment', ?, ?)
        ")->execute([
            $paymentId,
            $result['reference'],
            $result['payment_intent_id'],
            $result['qr_code_data'],
            $amount,
            json_encode($result),
        ]);

        Response::json([
            'payment_id' => $paymentId,
            'application_id' => $applicationId,
            'reference' => $result['reference'],
            'payment_intent_id' => $result['payment_intent_id'],
            'qr_code_data' => $result['qr_code_data'],
            'amount' => $amount,
            'instructions' => 'Present or scan this QRPh code with your banking or e-wallet application (GCash, Maya, etc.). Test Mode is active.',
        ], 'PayMongo QRPh payment initialized.');
    }

    /**
     * Simulate PayMongo QRPh Payment Completion (For Developer & Testing Mode)
     */
    /**
     * Simulate PayMongo QRPh Payment Completion (For Developer & Testing Mode)
     * Records payment as completed online and submitted to Treasury for review.
     */
    public static function simulatePayMongoPayment(int $applicationId): void {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT pa.*, fs.total_amount, pp.id AS payment_id, pp.status AS payment_status
            FROM permit_applications pa
            LEFT JOIN fee_snapshots fs ON fs.id = (SELECT id FROM fee_snapshots WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            LEFT JOIN permit_payments pp ON pp.id = (SELECT id FROM permit_payments WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            WHERE pa.id = ?
            LIMIT 1
        ");
        $stmt->execute([$applicationId]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application not found.', 404);
        }

        $amount = (float)$app['total_amount'];
        $onlineRemarks = "Paid online via PayMongo QRPh (GCash/Maya). Awaiting City Treasury review and official receipt approval.";

        $pdo->beginTransaction();
        try {
            // Update or create payment with status = PENDING (awaiting Treasury review)
            $stmtPay = $pdo->prepare("
                INSERT INTO permit_payments (application_id, payment_method, amount_due, amount_paid, status, remarks, created_at)
                VALUES (?, 'PAYMONGO_QRPH', ?, ?, 'PENDING', ?, NOW())
                ON DUPLICATE KEY UPDATE payment_method = 'PAYMONGO_QRPH', amount_paid = VALUES(amount_paid), status = 'PENDING', remarks = VALUES(remarks)
            ");
            $stmtPay->execute([$applicationId, $amount, $amount, $onlineRemarks]);
            $paymentId = $app['payment_id'] ?: (int)$pdo->lastInsertId();

            // Record transaction in payment_transactions
            $txNum = 'TX-PM-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
            $pdo->prepare("
                INSERT INTO payment_transactions (payment_id, transaction_number, gateway, paymongo_payment_intent_id, raw_status, amount, payload)
                VALUES (?, ?, 'PAYMONGO', ?, 'paid', ?, ?)
            ")->execute([
                $paymentId,
                $txNum,
                'pi_simulated_' . bin2hex(random_bytes(6)),
                $amount,
                json_encode(['status' => 'paid', 'method' => 'PAYMONGO_QRPH', 'simulated' => true])
            ]);

            // Application remains PENDING_TREASURY_PAYMENT (Stage 4) for Treasury review
            $pdo->prepare("
                UPDATE permit_applications
                SET status = 'PENDING_TREASURY_PAYMENT', current_stage = 4, updated_at = NOW()
                WHERE id = ?
            ")->execute([$applicationId]);

            // History timeline
            $pdo->prepare("
                INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
                VALUES (?, 'Treasury Payment', 'PENDING_TREASURY_PAYMENT', 'PayMongo Gateway', 'Online Payment Gateway', ?)
            ")->execute([$applicationId, "Online payment of ₱" . number_format($amount, 2) . " received via PayMongo QRPh. Submitted to City Treasury for validation."]);

            $pdo->commit();

            // Notify Treasury staff that an online payment is ready for review
            SocketService::emit('online_payment_submitted', [
                'title' => 'Online Payment Awaiting Review',
                'message' => "Application {$app['application_number']} paid ₱" . number_format($amount, 2) . " via PayMongo QRPh. Awaiting Treasury review and approval.",
                'application_id' => $applicationId,
                'application_number' => $app['application_number'],
                'amount' => $amount,
                'type' => 'info',
            ], 'treasury');

            Response::json([
                'status' => 'PENDING_TREASURY_PAYMENT',
                'payment_status' => 'PENDING',
                'amount_paid' => $amount,
                'message' => 'PayMongo QRPh online payment received! Forwarded to City Treasury for official receipt verification.',
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Failed to simulate payment: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Treasury: Review & Approve Online PayMongo QRPh Payment
     * Approves the online payment, generates Official Receipt, and sends application to Admin for permit release.
     */
    public static function verifyOnlinePayment(int $applicationId): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'web');
        RoleMiddleware::authorize($user, ['treasury', 'admin']);

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT pa.*, fs.total_amount, pp.id AS payment_id, pp.status AS payment_status, pp.payment_method, pp.amount_paid
            FROM permit_applications pa
            LEFT JOIN fee_snapshots fs ON fs.id = (SELECT id FROM fee_snapshots WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            LEFT JOIN permit_payments pp ON pp.id = (SELECT id FROM permit_payments WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            WHERE pa.id = ?
            LIMIT 1
        ");
        $stmt->execute([$applicationId]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application not found.', 404);
        }

        if ($app['status'] !== 'PENDING_TREASURY_PAYMENT') {
            Response::error('Application is not awaiting Treasury payment validation.', 400);
        }

        $amountDue = (float)$app['total_amount'];
        $amountPaid = (float)($app['amount_paid'] ?: $amountDue);

        $orNumber = trim($input['or_number'] ?? '');
        if (empty($orNumber)) {
            $orNumber = CodeGenerator::generateOrNumber($pdo);
        }

        $remarks = trim($input['remarks'] ?? 'Online PayMongo QRPh payment verified by City Treasury against electronic transaction records.');

        $pdo->beginTransaction();
        try {
            // Update permit_payments -> VERIFIED
            $paymentId = $app['payment_id'];
            if ($paymentId) {
                $pdo->prepare("
                    UPDATE permit_payments
                    SET status = 'VERIFIED', or_number = ?, treasury_user_id = ?, remarks = ?, verified_at = NOW()
                    WHERE id = ?
                ")->execute([$orNumber, $user['id'], $remarks, $paymentId]);
            } else {
                $stmtPay = $pdo->prepare("
                    INSERT INTO permit_payments (application_id, payment_method, amount_due, amount_paid, status, or_number, treasury_user_id, remarks, verified_at)
                    VALUES (?, 'PAYMONGO_QRPH', ?, ?, 'VERIFIED', ?, ?, ?, NOW())
                ");
                $stmtPay->execute([$applicationId, $amountDue, $amountPaid, $orNumber, $user['id'], $remarks]);
                $paymentId = (int)$pdo->lastInsertId();
            }

            // Insert official receipt
            $pdo->prepare("
                INSERT INTO official_receipts (or_number, application_id, payment_id, peddler_id, payor_name, amount, payment_type, issued_by_user_id, issued_date)
                VALUES (?, ?, ?, ?, ?, ?, 'PERMIT_FEE_QRPH', ?, CURDATE())
            ")->execute([
                $orNumber,
                $applicationId,
                $paymentId,
                $app['peddler_id'],
                $app['first_name'] . ' ' . $app['last_name'],
                $amountPaid,
                $user['id'],
            ]);

            // Advance application status -> READY_FOR_PERMIT_RELEASE (Sent to Admin for Permit Release)
            $pdo->prepare("
                UPDATE permit_applications
                SET status = 'READY_FOR_PERMIT_RELEASE', current_stage = 5, rejection_reason = NULL, updated_at = NOW()
                WHERE id = ?
            ")->execute([$applicationId]);

            // Log Treasury approval
            $pdo->prepare("
                INSERT INTO application_approvals (application_id, stage, user_id, decision, remarks)
                VALUES (?, 'TREASURY', ?, 'APPROVED', ?)
            ")->execute([$applicationId, $user['id'], "Online payment approved and verified. OR: $orNumber."]);

            // History timeline
            $pdo->prepare("
                INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
                VALUES (?, 'Treasury Payment', 'READY_FOR_PERMIT_RELEASE', ?, 'Treasury Officer', ?)
            ")->execute([
                $applicationId,
                $user['first_name'] . ' ' . $user['last_name'],
                "Online PayMongo QRPh payment of ₱" . number_format($amountPaid, 2) . " verified and approved by Treasury. Official Receipt #$orNumber issued. Forwarded to Admin for permit release."
            ]);

            $pdo->commit();

            EmailService::notifyPaymentVerified($app, $orNumber, $amountPaid);

            // Notify Admin for stage 5 permit release
            SocketService::emit('permit_release_ready', [
                'title' => 'Permit Ready for Release',
                'message' => "Application {$app['application_number']} online payment verified by Treasury. Ready for release by Admin.",
                'reference_id' => $app['application_number'],
                'type' => 'success',
            ], 'admin');

            Logger::log($user['id'], 'treasury', 'ONLINE_PAYMENT_VERIFIED', 'permit_payments', (string)$paymentId, [
                'or_number' => $orNumber,
                'amount' => $amountPaid,
                'method' => 'PAYMONGO_QRPH',
            ]);

            Response::json([
                'status' => 'READY_FOR_PERMIT_RELEASE',
                'or_number' => $orNumber,
                'amount_paid' => $amountPaid,
                'message' => 'Online payment verified and approved by Treasury. Forwarded to Admin for permit release.',
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Failed to verify online payment: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Treasury: Record Cash Payment & Verify (Web Application Only)
     */
    public static function recordCashPayment(int $applicationId): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'web');
        RoleMiddleware::authorize($user, ['treasury', 'admin']);

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $validator = Validator::make($input, [
            'amount_received' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            Response::error($validator->firstError(), 422, $validator->errors());
        }

        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT pa.*, fs.total_amount
            FROM permit_applications pa
            LEFT JOIN fee_snapshots fs ON pa.id = fs.application_id
            WHERE pa.id = ?
            LIMIT 1
        ");
        $stmt->execute([$applicationId]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application not found.', 404);
        }

        $amountDue = (float)$app['total_amount'];
        $amountReceived = (float)$input['amount_received'];
        $orNumber = trim($input['or_number'] ?? '');
        $remarks = trim($input['remarks'] ?? 'Cash payment received at City Treasury.');

        if (empty($orNumber)) {
            $orNumber = CodeGenerator::generateOrNumber($pdo);
        }

        if ($amountReceived < $amountDue) {
            Response::error("Amount received (₱" . number_format($amountReceived, 2) . ") is less than total amount due (₱" . number_format($amountDue, 2) . ").", 422);
        }

        $pdo->beginTransaction();
        try {
            // Insert/Update permit_payments
            $stmtPay = $pdo->prepare("
                INSERT INTO permit_payments (application_id, payment_method, amount_due, amount_paid, status, or_number, treasury_user_id, remarks, verified_at)
                VALUES (?, 'CASH', ?, ?, 'VERIFIED', ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE payment_method = 'CASH', amount_paid = VALUES(amount_paid), status = 'VERIFIED', or_number = VALUES(or_number), treasury_user_id = VALUES(treasury_user_id), remarks = VALUES(remarks), verified_at = NOW()
            ");
            $stmtPay->execute([$applicationId, $amountDue, $amountReceived, $orNumber, $user['id'], $remarks]);
            $paymentId = (int)$pdo->lastInsertId();

            // Insert official receipt
            $pdo->prepare("
                INSERT INTO official_receipts (or_number, application_id, payment_id, peddler_id, payor_name, amount, payment_type, issued_by_user_id, issued_date)
                VALUES (?, ?, ?, ?, ?, ?, 'PERMIT_FEE_CASH', ?, CURDATE())
            ")->execute([
                $orNumber,
                $applicationId,
                $paymentId,
                $app['peddler_id'],
                $app['first_name'] . ' ' . $app['last_name'],
                $amountReceived,
                $user['id'],
            ]);

            // Update application status -> READY_FOR_PERMIT_RELEASE
            $pdo->prepare("
                UPDATE permit_applications
                SET status = 'READY_FOR_PERMIT_RELEASE', current_stage = 5, rejection_reason = NULL, updated_at = NOW()
                WHERE id = ?
            ")->execute([$applicationId]);

            // Log approval
            $pdo->prepare("
                INSERT INTO application_approvals (application_id, stage, user_id, decision, remarks)
                VALUES (?, 'TREASURY', ?, 'APPROVED', ?)
            ")->execute([$applicationId, $user['id'], "Cash payment verified. OR: $orNumber."]);

            // History timeline
            $pdo->prepare("
                INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
                VALUES (?, 'Treasury Payment', 'READY_FOR_PERMIT_RELEASE', ?, 'Treasury Officer', ?)
            ")->execute([
                $applicationId,
                $user['first_name'] . ' ' . $user['last_name'],
                "Cash payment of ₱" . number_format($amountReceived, 2) . " received. Official Receipt #$orNumber issued."
            ]);

            $pdo->commit();

            EmailService::notifyPaymentVerified($app, $orNumber, $amountReceived);

            SocketService::emit('permit_release_ready', [
                'title' => 'Permit Ready for Release',
                'message' => "Application {$app['application_number']} cash payment verified by Treasury. Ready for release.",
                'reference_id' => $app['application_number'],
                'type' => 'success',
            ], 'admin');

            Logger::log($user['id'], 'treasury', 'CASH_PAYMENT_VERIFIED', 'permit_payments', (string)$paymentId, [
                'or_number' => $orNumber,
                'amount' => $amountReceived,
            ]);

            Response::json([
                'status' => 'READY_FOR_PERMIT_RELEASE',
                'or_number' => $orNumber,
                'amount_paid' => $amountReceived,
                'message' => 'Cash payment verified and receipt issued.',
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Failed to process cash payment: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Treasury: Reject Payment
     */
    public static function rejectPayment(int $applicationId): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'web');
        RoleMiddleware::authorize($user, ['treasury', 'admin']);

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $reason = trim($input['reason'] ?? '');

        if (empty($reason)) {
            Response::error('A rejection reason is mandatory when rejecting payment.', 422);
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM permit_applications WHERE id = ? LIMIT 1");
        $stmt->execute([$applicationId]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application not found.', 404);
        }

        $pdo->prepare("
            UPDATE permit_applications
            SET status = 'PAYMENT_REJECTED', rejection_reason = ?, rejected_by_role = 'Treasury', updated_at = NOW()
            WHERE id = ?
        ")->execute([$reason, $applicationId]);

        $pdo->prepare("
            UPDATE permit_payments
            SET status = 'REJECTED', remarks = ?
            WHERE application_id = ?
        ")->execute([$reason, $applicationId]);

        $pdo->prepare("
            INSERT INTO application_approvals (application_id, stage, user_id, decision, remarks)
            VALUES (?, 'TREASURY', ?, 'REJECTED', ?)
        ")->execute([$applicationId, $user['id'], $reason]);

        $pdo->prepare("
            INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
            VALUES (?, 'Treasury Payment', 'PAYMENT_REJECTED', ?, 'Treasury Officer', ?)
        ")->execute([$applicationId, $user['first_name'] . ' ' . $user['last_name'], "Payment rejected: $reason"]);

        EmailService::notifyRejected($app, 'City Treasury', $reason);

        Logger::log($user['id'], 'treasury', 'PAYMENT_REJECTED', 'permit_applications', (string)$applicationId, [
            'reason' => $reason,
        ]);

        Response::json(['status' => 'PAYMENT_REJECTED'], 'Payment rejected.');
    }

    /**
     * PayMongo Webhook Endpoint
     */
    public static function handleWebhook(): void {
        $payload = file_get_contents('php://input');
        $headers = getallheaders();
        $signatureHeader = $headers['Paymongo-Signature'] ?? $headers['paymongo-signature'] ?? '';

        $service = new PayMongoService();
        if (!$service->verifyWebhookSignature($payload, $signatureHeader)) {
            Response::error('Invalid webhook signature.', 400);
        }

        $data = json_decode($payload, true);
        if (!$data || !isset($data['data']['attributes']['type'])) {
            Response::error('Invalid webhook payload structure.', 400);
        }

        $eventType = $data['data']['attributes']['type'];
        $eventData = $data['data']['attributes']['data'];
        $eventId = $data['data']['id'] ?? ('evt_' . time());

        $pdo = Database::getConnection();

        // Idempotency: Prevent duplicate processing
        $stmtCheck = $pdo->prepare("SELECT id FROM payment_webhooks WHERE event_id = ? LIMIT 1");
        $stmtCheck->execute([$eventId]);
        if ($stmtCheck->fetch()) {
            Response::json(['received' => true, 'duplicate' => true]);
        }

        // Store webhook record
        $pdo->prepare("
            INSERT INTO payment_webhooks (event_id, event_type, payload, is_processed, processed_at)
            VALUES (?, ?, ?, 1, NOW())
        ")->execute([$eventId, $eventType, $payload]);

        // Process payment.paid event
        if ($eventType === 'payment.paid') {
            $paymentIntentId = $eventData['attributes']['payment_intent_id'] ?? '';
            $amount = ($eventData['attributes']['amount'] ?? 0) / 100;

            if ($paymentIntentId) {
                $stmtTx = $pdo->prepare("SELECT payment_id FROM payment_transactions WHERE paymongo_payment_intent_id = ? LIMIT 1");
                $stmtTx->execute([$paymentIntentId]);
                $tx = $stmtTx->fetch();

                if ($tx && $tx['payment_id']) {
                    $pdo->prepare("UPDATE permit_payments SET status = 'VERIFIED', amount_paid = ?, verified_at = NOW() WHERE id = ?")
                        ->execute([$amount, $tx['payment_id']]);
                }
            }
        }

        Response::json(['received' => true]);
    }
}
