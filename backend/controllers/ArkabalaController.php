<?php
/**
 * Weekly Arkabala Collection Controller
 * Manages QR Code scanning by Inspector on Mobile, recording weekly collections,
 * checking payment status (PAID/UNPAID/OVERDUE), duplicate prevention, and Treasury reconciliation.
 */

class ArkabalaController {
    /**
     * Scan Peddler QR Code & Fetch Real-Time Vending & Payment Status
     */
    public static function scanPeddlerQr(): void {
        $user = AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $token = trim($_GET['token'] ?? '');
        if (empty($token)) {
            Response::error('QR token is required.', 422);
        }

        // Fetch peddler by QR token or peddler_code
        $stmt = $pdo->prepare("
            SELECT p.*, pq.is_active AS qr_active,
                   pa.residential_address, pa.residential_barangay, pa.residential_city,
                   pa.business_address, pa.business_barangay, pa.business_city,
                   pm.permit_number, pm.valid_from, pm.valid_until, pm.status AS permit_status
            FROM peddlers p
            LEFT JOIN peddler_qr_codes pq ON p.id = pq.peddler_id
            LEFT JOIN peddler_addresses pa ON p.id = pa.peddler_id
            LEFT JOIN permits pm ON p.id = pm.peddler_id AND pm.status = 'active'
            WHERE pq.token = ? OR p.peddler_code = ?
            LIMIT 1
        ");
        $stmt->execute([$token, $token]);
        $peddler = $stmt->fetch();

        if (!$peddler) {
            Response::error('Peddler QR Code not recognized or invalid.', 404);
        }

        $peddlerId = (int)$peddler['id'];

        // Get current active collection week
        $currentDate = date('Y-m-d');
        $stmtWeek = $pdo->prepare("
            SELECT * FROM arkabala_collection_weeks
            WHERE start_date <= ? AND end_date >= ?
            LIMIT 1
        ");
        $stmtWeek->execute([$currentDate, $currentDate]);
        $currentWeek = $stmtWeek->fetch();

        if (!$currentWeek) {
            // Fallback to latest week
            $stmtWeek = $pdo->query("SELECT * FROM arkabala_collection_weeks ORDER BY id DESC LIMIT 1");
            $currentWeek = $stmtWeek->fetch();
        }

        $currentWeekId = $currentWeek ? (int)$currentWeek['id'] : 1;
        $standardRate = $currentWeek ? (float)$currentWeek['base_fee'] : 50.00;

        // Check if current week is settled
        $stmtCurrentPaid = $pdo->prepare("
            SELECT * FROM arkabala_collections
            WHERE peddler_id = ? AND collection_week_id = ?
            LIMIT 1
        ");
        $stmtCurrentPaid->execute([$peddlerId, $currentWeekId]);
        $currentCollection = $stmtCurrentPaid->fetch();

        // Calculate payment status: PAID, UNPAID, or OVERDUE
        $status = 'UNPAID';
        if ($currentCollection && $currentCollection['status'] === 'PAID') {
            $status = 'PAID';
        } else {
            // Check if prior weeks are unpaid
            $stmtPriorUnpaid = $pdo->prepare("
                SELECT acw.id, acw.week_number, acw.base_fee
                FROM arkabala_collection_weeks acw
                WHERE acw.id < ? AND acw.is_active = 1
                AND NOT EXISTS (
                    SELECT 1 FROM arkabala_collections ac
                    WHERE ac.peddler_id = ? AND ac.collection_week_id = acw.id AND ac.status = 'PAID'
                )
            ");
            $stmtPriorUnpaid->execute([$currentWeekId, $peddlerId]);
            $unpaidWeeks = $stmtPriorUnpaid->fetchAll();
            if (!empty($unpaidWeeks)) {
                $status = 'OVERDUE';
            }
        }

        // Fetch payment history
        $stmtHistory = $pdo->prepare("
            SELECT ac.*, acw.week_number, acw.year, acw.start_date, acw.end_date,
                   u.first_name AS inspector_first_name, u.last_name AS inspector_last_name
            FROM arkabala_collections ac
            JOIN arkabala_collection_weeks acw ON ac.collection_week_id = acw.id
            JOIN users u ON ac.collected_by_user_id = u.id
            WHERE ac.peddler_id = ?
            ORDER BY ac.id DESC
            LIMIT 10
        ");
        $stmtHistory->execute([$peddlerId]);
        $history = $stmtHistory->fetchAll();

        // Calculate total outstanding balance
        $stmtTotalUnpaid = $pdo->prepare("
            SELECT SUM(acw.base_fee) AS outstanding
            FROM arkabala_collection_weeks acw
            WHERE acw.id <= ? AND acw.is_active = 1
            AND NOT EXISTS (
                SELECT 1 FROM arkabala_collections ac
                WHERE ac.peddler_id = ? AND ac.collection_week_id = acw.id AND ac.status = 'PAID'
            )
        ");
        $stmtTotalUnpaid->execute([$currentWeekId, $peddlerId]);
        $outstandingBalance = (float)($stmtTotalUnpaid->fetch()['outstanding'] ?? 0);

        Response::json([
            'peddler_id' => $peddlerId,
            'peddler_code' => $peddler['peddler_code'],
            'peddler_name' => $peddler['first_name'] . ' ' . ($peddler['middle_name'] ? $peddler['middle_name'] . ' ' : '') . $peddler['last_name'],
            'business_name' => $peddler['business_nature'],
            'business_address' => $peddler['business_address'],
            'barangay' => $peddler['business_barangay'],
            'city' => $peddler['business_city'],
            'num_papag' => (int)$peddler['num_papag'],
            'num_lag_it' => (int)$peddler['num_lag_it'],
            'permit_number' => $peddler['permit_number'] ?? 'N/A',
            'permit_status' => $peddler['permit_status'] ?? 'INACTIVE',
            'is_qr_active' => (bool)$peddler['qr_active'],
            'current_week' => $currentWeek,
            'arkabala_status' => $status,
            'current_week_paid' => ($status === 'PAID'),
            'outstanding_balance' => $outstandingBalance,
            'required_weekly_amount' => $standardRate,
            'payment_history' => $history,
        ], 'Peddler QR record verified.');
    }

    /**
     * Record Weekly Arkabala Collection (Inspector Mobile)
     */
    public static function recordCollection(): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'mobile');
        RoleMiddleware::authorize($user, ['inspector', 'admin']);

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $validator = Validator::make($input, [
            'peddler_id' => 'required|numeric',
            'collection_week_id' => 'required|numeric',
            'amount' => 'required|numeric',
            'payment_method' => 'required|in:CASH,ONLINE',
        ]);

        if ($validator->fails()) {
            Response::error($validator->firstError(), 422, $validator->errors());
        }

        $peddlerId = (int)$input['peddler_id'];
        $weekId = (int)$input['collection_week_id'];
        $amount = (float)$input['amount'];
        $method = $input['payment_method'];
        $notes = trim($input['notes'] ?? '');

        $pdo = Database::getConnection();

        // 1. Prevent duplicate collection for same peddler and week
        $stmtCheck = $pdo->prepare("
            SELECT id, transaction_code, receipt_number, amount, collection_date
            FROM arkabala_collections
            WHERE peddler_id = ? AND collection_week_id = ?
            LIMIT 1
        ");
        $stmtCheck->execute([$peddlerId, $weekId]);
        $existing = $stmtCheck->fetch();

        if ($existing) {
            Response::error("Payment for this collection week has already been recorded (Receipt: {$existing['receipt_number']}).", 409);
        }

        // Fetch week info
        $stmtWeek = $pdo->prepare("SELECT * FROM arkabala_collection_weeks WHERE id = ? LIMIT 1");
        $stmtWeek->execute([$weekId]);
        $week = $stmtWeek->fetch();
        if (!$week) {
            Response::error('Invalid collection week.', 404);
        }

        $txCode = CodeGenerator::generateArkabalaTransactionCode($pdo, (int)$week['week_number']);
        $receiptNumber = 'ARK-REC-' . date('Ymd') . '-' . sprintf("%04d", mt_rand(1, 9999));
        $collectionDate = date('Y-m-d');

        $pdo->beginTransaction();
        try {
            $stmtInsert = $pdo->prepare("
                INSERT INTO arkabala_collections (
                    transaction_code, peddler_id, collection_week_id, amount, collection_date,
                    payment_method, collected_by_user_id, status, receipt_number, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?)
            ");
            $stmtInsert->execute([
                $txCode,
                $peddlerId,
                $weekId,
                $amount,
                $collectionDate,
                $method,
                $user['id'],
                $receiptNumber,
                $notes,
            ]);
            $collectionId = (int)$pdo->lastInsertId();

            // Record in arkabala_payments ledger
            $pdo->prepare("
                INSERT INTO arkabala_payments (collection_id, payment_reference, amount)
                VALUES (?, ?, ?)
            ")->execute([$collectionId, $receiptNumber, $amount]);

            $pdo->commit();

            // Notify real-time
            SocketService::emit('arkabala_collected', [
                'title' => 'Arkabala Collected',
                'message' => "Arkabala of ₱" . number_format($amount, 2) . " collected for Week {$week['week_number']}.",
                'reference_id' => $receiptNumber,
                'type' => 'success',
            ], 'treasury');

            Logger::log($user['id'], 'inspector', 'ARKABALA_COLLECTED', 'arkabala_collections', (string)$collectionId, [
                'transaction_code' => $txCode,
                'receipt_number' => $receiptNumber,
                'peddler_id' => $peddlerId,
                'amount' => $amount,
                'week' => $week['week_number'],
            ], 'mobile');

            Response::json([
                'collection_id' => $collectionId,
                'transaction_code' => $txCode,
                'receipt_number' => $receiptNumber,
                'amount' => $amount,
                'collection_date' => $collectionDate,
                'week_number' => $week['week_number'],
                'status' => 'PAID',
                'message' => 'Arkabala collection successfully recorded.',
            ], 'Arkabala payment recorded.', 201);

        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Failed to record collection: ' . $e->getMessage(), 500);
        }
    }

    /**
     * List Arkabala Collection Weeks
     */
    public static function listWeeks(): void {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("SELECT * FROM arkabala_collection_weeks ORDER BY year DESC, week_number DESC");
        $weeks = $stmt->fetchAll();

        Response::json($weeks, 'Collection weeks retrieved.');
    }

    /**
     * Treasury: List and Reconcile Collections
     */
    public static function listCollections(): void {
        $user = AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $weekId = $_GET['week_id'] ?? null;
        $date = $_GET['date'] ?? null;
        $reconciled = $_GET['reconciled'] ?? null;

        $conditions = ["1=1"];
        $params = [];

        if (!empty($weekId)) {
            $conditions[] = "ac.collection_week_id = ?";
            $params[] = $weekId;
        }

        if (!empty($date)) {
            $conditions[] = "ac.collection_date = ?";
            $params[] = $date;
        }

        if ($reconciled !== null && $reconciled !== '') {
            $conditions[] = "ac.reconciled_by_treasury = ?";
            $params[] = (int)$reconciled;
        }

        $whereClause = implode(" AND ", $conditions);

        $stmt = $pdo->prepare("
            SELECT ac.*, p.peddler_code, p.first_name, p.last_name, p.business_nature,
                   acw.week_number, acw.year,
                   u.first_name AS inspector_first_name, u.last_name AS inspector_last_name
            FROM arkabala_collections ac
            JOIN peddlers p ON ac.peddler_id = p.id
            JOIN arkabala_collection_weeks acw ON ac.collection_week_id = acw.id
            JOIN users u ON ac.collected_by_user_id = u.id
            WHERE {$whereClause}
            ORDER BY ac.id DESC
        ");
        $stmt->execute($params);
        $collections = $stmt->fetchAll();

        Response::json($collections, 'Collections retrieved.');
    }

    /**
     * Treasury: Reconcile Arkabala Collections
     */
    public static function reconcileCollections(): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'web');
        RoleMiddleware::authorize($user, ['treasury', 'admin']);

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $collectionIds = $input['collection_ids'] ?? [];

        if (empty($collectionIds) || !is_array($collectionIds)) {
            Response::error('Please select at least one collection record to reconcile.', 422);
        }

        $pdo = Database::getConnection();
        $placeholders = implode(',', array_fill(0, count($collectionIds), '?'));

        $stmt = $pdo->prepare("
            UPDATE arkabala_collections
            SET reconciled_by_treasury = 1
            WHERE id IN ({$placeholders})
        ");
        $stmt->execute($collectionIds);

        Logger::log($user['id'], 'treasury', 'ARKABALA_RECONCILED', 'arkabala_collections', null, [
            'count' => count($collectionIds),
            'ids' => $collectionIds,
        ]);

        Response::json(['reconciled_count' => count($collectionIds)], 'Collections marked as reconciled.');
    }
}
