<?php
/**
 * Violations Management Controller
 * Handles violation types, issuing violations with photo evidence (Inspector Mobile),
 * settling penalties, and viewing history.
 */

class ViolationController {
    /**
     * List Violation Types
     */
    public static function listTypes(): void {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("SELECT * FROM violation_types WHERE is_active = 1 ORDER BY id ASC");
        $types = $stmt->fetchAll();

        Response::json($types, 'Violation types retrieved.');
    }

    /**
     * List Violations with Filters
     */
    public static function index(): void {
        $user = AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $peddlerId = $_GET['peddler_id'] ?? null;
        $status = $_GET['status'] ?? null;

        $conditions = ["1=1"];
        $params = [];

        // If peddler user, only show their violations
        if (strtolower($user['role_name']) === 'peddler') {
            $conditions[] = "(p.peddler_code = ? OR p.email = ?)";
            $params[] = $user['peddler_id'] ?? '';
            $params[] = $user['email'] ?? '';
        }

        if (!empty($peddlerId)) {
            $conditions[] = "(pv.peddler_id = ? OR p.peddler_code = ?)";
            $params[] = $peddlerId;
            $params[] = $peddlerId;
        }

        if (!empty($status)) {
            $conditions[] = "pv.status = ?";
            $params[] = $status;
        }

        $whereClause = implode(" AND ", $conditions);

        $stmt = $pdo->prepare("
            SELECT pv.*, vt.name AS violation_name, vt.code AS violation_code,
                   p.peddler_code, p.first_name, p.last_name, p.business_nature,
                   u.first_name AS issued_by_first_name, u.last_name AS issued_by_last_name,
                   vp.receipt_number, vp.payment_method AS settled_payment_method, vp.paid_at AS payment_date
            FROM peddler_violations pv
            JOIN violation_types vt ON pv.violation_type_id = vt.id
            JOIN peddlers p ON pv.peddler_id = p.id
            JOIN users u ON pv.issued_by_user_id = u.id
            LEFT JOIN violation_payments vp ON vp.id = (
                SELECT id FROM violation_payments WHERE violation_id = pv.id ORDER BY id DESC LIMIT 1
            )
            WHERE {$whereClause}
            ORDER BY pv.id DESC
        ");
        $stmt->execute($params);
        $violations = $stmt->fetchAll();

        Response::json($violations, 'Violations list retrieved.');
    }

    /**
     * Issue a New Violation (Inspector Mobile)
     */
    public static function store(): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'mobile');
        RoleMiddleware::authorize($user, ['inspector', 'admin']);

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $validator = Validator::make($input, [
            'peddler_id' => 'required',
            'violation_type_id' => 'required|numeric',
            'description' => 'required',
        ]);

        if ($validator->fails()) {
            Response::error($validator->firstError(), 422, $validator->errors());
        }

        $pdo = Database::getConnection();

        // Find peddler by ID or peddler_code
        $peddlerIdentifier = trim($input['peddler_id']);
        $stmtP = $pdo->prepare("SELECT * FROM peddlers WHERE id = ? OR peddler_code = ? LIMIT 1");
        $stmtP->execute([$peddlerIdentifier, $peddlerIdentifier]);
        $peddler = $stmtP->fetch();

        if (!$peddler) {
            Response::error('Peddler not found.', 404);
        }

        $peddlerId = (int)$peddler['id'];
        $typeId = (int)$input['violation_type_id'];

        $stmtT = $pdo->prepare("SELECT * FROM violation_types WHERE id = ? LIMIT 1");
        $stmtT->execute([$typeId]);
        $vType = $stmtT->fetch();

        if (!$vType) {
            Response::error('Violation type not found.', 404);
        }

        $penalty = !empty($input['penalty_amount']) ? (float)$input['penalty_amount'] : (float)$vType['default_penalty'];
        $violNumber = CodeGenerator::generateViolationNumber($pdo);
        $violDate = $input['violation_date'] ?? date('Y-m-d');
        $desc = trim($input['description']);
        $photoPath = trim($input['evidence_photo_path'] ?? '');

        $stmt = $pdo->prepare("
            INSERT INTO peddler_violations (
                violation_number, peddler_id, violation_type_id, description,
                evidence_photo_path, violation_date, penalty_amount, status, issued_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'UNPAID', ?)
        ");
        $stmt->execute([
            $violNumber,
            $peddlerId,
            $typeId,
            $desc,
            $photoPath,
            $violDate,
            $penalty,
            $user['id'],
        ]);
        $violId = (int)$pdo->lastInsertId();

        // Send email to peddler
        EmailService::notifyViolationIssued($peddler, $violNumber, $vType['name'], $penalty, $desc);

        // Realtime notification
        SocketService::emit('violation_issued', [
            'title' => 'New Violation Recorded',
            'message' => "Violation $violNumber issued to {$peddler['peddler_code']}: {$vType['name']} (₱" . number_format($penalty, 2) . ").",
            'reference_id' => $violNumber,
            'type' => 'warning',
        ], 'admin');

        Logger::log($user['id'], 'inspector', 'VIOLATION_ISSUED', 'peddler_violations', (string)$violId, [
            'violation_number' => $violNumber,
            'peddler_code' => $peddler['peddler_code'],
            'type' => $vType['name'],
            'penalty' => $penalty,
        ], 'mobile');

        Response::json([
            'id' => $violId,
            'violation_number' => $violNumber,
            'penalty_amount' => $penalty,
            'status' => 'UNPAID',
            'message' => 'Violation notice issued and peddler notified.',
        ], 'Violation recorded successfully.', 201);
    }

    /**
     * Create PayMongo QRPh for a Violation Penalty (Online Website Payment)
     */
    public static function createPayMongoQrPh(int $violationId): void {
        $user = AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT pv.*, vt.name AS violation_name, p.peddler_code, p.first_name, p.last_name, p.email AS peddler_email
            FROM peddler_violations pv
            JOIN violation_types vt ON pv.violation_type_id = vt.id
            JOIN peddlers p ON pv.peddler_id = p.id
            WHERE pv.id = ? LIMIT 1
        ");
        $stmt->execute([$violationId]);
        $violation = $stmt->fetch();

        if (!$violation) {
            Response::error('Violation record not found.', 404);
        }

        if ($violation['status'] === 'PAID') {
            Response::error('Violation has already been settled and paid.', 400);
        }

        // If peddler user, ensure ownership
        if (strtolower($user['role_name']) === 'peddler') {
            $userPeddlerCode = $user['peddler_id'] ?? '';
            $userEmail = $user['email'] ?? '';
            if ($violation['peddler_code'] !== $userPeddlerCode && $violation['peddler_email'] !== $userEmail) {
                Response::error('Unauthorized to access this violation record.', 403);
            }
        }

        $amount = (float)$violation['penalty_amount'];
        $service = new PayMongoService();
        $qrResult = $service->createQrPhPayment(
            $amount,
            "Penalty Payment: {$violation['violation_number']} - {$violation['violation_name']}",
            [
                'violation_id' => $violation['id'],
                'violation_number' => $violation['violation_number'],
                'peddler_code' => $violation['peddler_code'],
                'type' => 'violation_penalty'
            ]
        );

        Response::json([
            'violation_id' => $violationId,
            'violation_number' => $violation['violation_number'],
            'violation_name' => $violation['violation_name'],
            'penalty_amount' => $amount,
            'reference' => $qrResult['reference'] ?? ('REF-' . $violation['violation_number']),
            'qr_code_data' => $qrResult['qr_code_data'] ?? '',
            'payment_intent_id' => $qrResult['payment_intent_id'] ?? '',
            'status' => 'awaiting_payment',
            'instructions' => 'Scan QRPh with GCash, Maya, ShopeePay, or any InstaPay-compliant app.',
        ], 'PayMongo QRPh checkout created for violation penalty.');
    }

    /**
     * Settle / Pay a Violation (Website Online Checkout or Treasury Cash)
     */
    public static function settleViolation(int $violationId): void {
        $user = AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT pv.*, vt.name AS violation_name, p.peddler_code, p.first_name, p.last_name, p.email AS peddler_email
            FROM peddler_violations pv
            JOIN violation_types vt ON pv.violation_type_id = vt.id
            JOIN peddlers p ON pv.peddler_id = p.id
            WHERE pv.id = ? LIMIT 1
        ");
        $stmt->execute([$violationId]);
        $violation = $stmt->fetch();

        if (!$violation) {
            Response::error('Violation record not found.', 404);
        }

        if ($violation['status'] === 'PAID') {
            Response::error('Violation has already been settled and paid.', 400);
        }

        // If peddler user, ensure ownership
        if (strtolower($user['role_name']) === 'peddler') {
            $userPeddlerCode = $user['peddler_id'] ?? '';
            $userEmail = $user['email'] ?? '';
            if ($violation['peddler_code'] !== $userPeddlerCode && $violation['peddler_email'] !== $userEmail) {
                Response::error('Unauthorized to access this violation record.', 403);
            }
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $rawMethod = strtoupper($input['payment_method'] ?? 'ONLINE');
        $method = in_array($rawMethod, ['ONLINE', 'PAYMONGO_QRPH', 'GCASH', 'MAYA']) ? 'ONLINE' : 'CASH';
        $receiptNumber = 'VIOL-OR-' . date('Ymd') . '-' . sprintf("%04d", mt_rand(1000, 9999));
        $amount = (float)$violation['penalty_amount'];

        $pdo->beginTransaction();
        try {
            $pdo->prepare("
                UPDATE peddler_violations
                SET status = 'PAID', resolved_at = NOW()
                WHERE id = ?
            ")->execute([$violationId]);

            $pdo->prepare("
                INSERT INTO violation_payments (violation_id, amount_paid, payment_method, receipt_number, paid_at)
                VALUES (?, ?, ?, ?, NOW())
            ")->execute([$violationId, $amount, $method, $receiptNumber]);

            $pdo->commit();

            Logger::log($user['id'], $user['role_name'], 'VIOLATION_SETTLED', 'peddler_violations', (string)$violationId, [
                'receipt_number' => $receiptNumber,
                'amount' => $amount,
                'method' => $method,
            ]);

            // Realtime notification to staff
            SocketService::emit('violation_paid', [
                'title' => 'Violation Settled via Website',
                'message' => "Violation {$violation['violation_number']} penalty of ₱" . number_format($amount, 2) . " settled online.",
                'violation_number' => $violation['violation_number'],
                'receipt_number' => $receiptNumber,
                'amount' => $amount,
            ], 'admin');

            Response::json([
                'violation_id' => $violationId,
                'violation_number' => $violation['violation_number'],
                'violation_name' => $violation['violation_name'],
                'peddler_code' => $violation['peddler_code'],
                'peddler_name' => "{$violation['first_name']} {$violation['last_name']}",
                'status' => 'PAID',
                'receipt_number' => $receiptNumber,
                'amount_paid' => $amount,
                'payment_method' => $method,
                'paid_at' => date('Y-m-d H:i:s'),
                'message' => "Violation penalty of ₱" . number_format($amount, 2) . " successfully paid online. Official Receipt: {$receiptNumber}.",
            ], 'Violation successfully settled and marked paid.');

        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Failed to settle violation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Simulate PayMongo Online Payment for Violation (Developer & Test Mode)
     */
    public static function simulatePayMongoPayment(int $violationId): void {
        self::settleViolation($violationId);
    }
}
