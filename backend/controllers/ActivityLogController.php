<?php
/**
 * Activity Log (Audit Trail) Controller
 */

class ActivityLogController {
    public static function index(): void {
        $user = AuthMiddleware::authenticate();
        PlatformMiddleware::enforce($user, 'web');
        RoleMiddleware::authorize($user, ['admin']);

        $pdo = Database::getConnection();

        $action = $_GET['action'] ?? null;
        $role = $_GET['role'] ?? null;
        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = max(1, min(100, (int)($_GET['per_page'] ?? 20)));
        $offset = ($page - 1) * $perPage;

        $conditions = ["1=1"];
        $params = [];

        if (!empty($action)) {
            $conditions[] = "al.action LIKE ?";
            $params[] = "%{$action}%";
        }

        if (!empty($role)) {
            $conditions[] = "al.role_name = ?";
            $params[] = $role;
        }

        $whereClause = implode(" AND ", $conditions);

        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM activity_logs al WHERE {$whereClause}");
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        $stmt = $pdo->prepare("
            SELECT al.*, u.first_name, u.last_name, u.email
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE {$whereClause}
            ORDER BY al.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ");
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        foreach ($logs as &$log) {
            if ($log['details']) {
                $log['details'] = json_decode($log['details'], true);
            }
        }

        Response::paginate($logs, $total, $page, $perPage, 'Activity logs retrieved.');
    }
}
