<?php
/**
 * Permit Tax and Fee Management Controller
 * Allows Admin to configure permit fees, add new fees, toggle activation, and update rates
 * while preserving historical fee snapshots in past transactions.
 */

class FeeManagementController {
    /**
     * List all permit fees
     */
    public static function index(): void {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("SELECT * FROM permit_fees ORDER BY id ASC");
        $fees = $stmt->fetchAll();

        Response::json($fees, 'Permit fees retrieved.');
    }

    /**
     * Add New Fee
     */
    public static function store(): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'web');
        RoleMiddleware::authorize($user, ['admin']);

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $validator = Validator::make($input, [
            'code' => 'required',
            'name' => 'required',
            'amount' => 'required|numeric',
            'fee_type' => 'required|in:fixed,per_unit',
        ]);

        if ($validator->fails()) {
            Response::error($validator->firstError(), 422, $validator->errors());
        }

        $pdo = Database::getConnection();

        // Check code uniqueness
        $stmtCheck = $pdo->prepare("SELECT id FROM permit_fees WHERE code = ? LIMIT 1");
        $stmtCheck->execute([strtoupper(trim($input['code']))]);
        if ($stmtCheck->fetch()) {
            Response::error('A fee with that code already exists.', 409);
        }

        $code = strtoupper(trim($input['code']));
        $name = trim($input['name']);
        $amount = (float)$input['amount'];
        $feeType = $input['fee_type'];
        $unitName = !empty($input['unit_name']) ? trim($input['unit_name']) : null;
        $desc = trim($input['description'] ?? '');

        $stmt = $pdo->prepare("
            INSERT INTO permit_fees (code, name, amount, fee_type, unit_name, description, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        ");
        $stmt->execute([$code, $name, $amount, $feeType, $unitName, $desc]);
        $feeId = (int)$pdo->lastInsertId();

        Logger::log($user['id'], 'admin', 'FEE_ADDED', 'permit_fees', (string)$feeId, [
            'code' => $code,
            'name' => $name,
            'amount' => $amount,
        ]);

        Response::json(['id' => $feeId], 'New fee item added successfully.', 201);
    }

    /**
     * Update Existing Fee
     */
    public static function update(int $id): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'web');
        RoleMiddleware::authorize($user, ['admin']);

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM permit_fees WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            Response::error('Fee record not found.', 404);
        }

        $name = trim($input['name'] ?? $existing['name']);
        $amount = isset($input['amount']) ? (float)$input['amount'] : (float)$existing['amount'];
        $feeType = $input['fee_type'] ?? $existing['fee_type'];
        $unitName = $input['unit_name'] ?? $existing['unit_name'];
        $desc = $input['description'] ?? $existing['description'];
        $isActive = isset($input['is_active']) ? (int)$input['is_active'] : (int)$existing['is_active'];

        $stmtUpdate = $pdo->prepare("
            UPDATE permit_fees
            SET name = ?, amount = ?, fee_type = ?, unit_name = ?, description = ?, is_active = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmtUpdate->execute([$name, $amount, $feeType, $unitName, $desc, $isActive, $id]);

        Logger::log($user['id'], 'admin', 'FEE_UPDATED', 'permit_fees', (string)$id, [
            'old_amount' => $existing['amount'],
            'new_amount' => $amount,
            'is_active' => $isActive,
        ]);

        Response::json([
            'id' => $id,
            'name' => $name,
            'amount' => $amount,
            'is_active' => $isActive,
        ], 'Fee schedule updated.');
    }

    /**
     * Toggle Fee Active Status
     */
    public static function toggleActive(int $id): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'web');
        RoleMiddleware::authorize($user, ['admin']);

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT is_active FROM permit_fees WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            Response::error('Fee record not found.', 404);
        }

        $newStatus = $existing['is_active'] ? 0 : 1;
        $pdo->prepare("UPDATE permit_fees SET is_active = ?, updated_at = NOW() WHERE id = ?")->execute([$newStatus, $id]);

        Logger::log($user['id'], 'admin', 'FEE_TOGGLED', 'permit_fees', (string)$id, ['is_active' => $newStatus]);

        Response::json(['id' => $id, 'is_active' => $newStatus], 'Fee status updated.');
    }
}
