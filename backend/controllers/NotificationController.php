<?php
/**
 * Notifications Controller
 */

class NotificationController {
    public static function index(): void {
        $user = AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $role = strtolower($user['role_name']);
        $userId = $user['id'];

        $stmt = $pdo->prepare("
            SELECT * FROM notifications
            WHERE (user_id = ? OR target_role = ? OR target_role IS NULL)
            ORDER BY id DESC
            LIMIT 25
        ");
        $stmt->execute([$userId, $role]);
        $notifications = $stmt->fetchAll();

        $unreadCount = 0;
        foreach ($notifications as $n) {
            if (!$n['is_read']) $unreadCount++;
        }

        Response::json([
            'unread_count' => $unreadCount,
            'notifications' => $notifications,
        ], 'Notifications retrieved.');
    }

    public static function markAsRead(int $id): void {
        $user = AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = ?")->execute([$id]);

        Response::json(null, 'Notification marked as read.');
    }

    public static function markAllAsRead(): void {
        $user = AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $role = strtolower($user['role_name']);
        $userId = $user['id'];

        $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? OR target_role = ?")->execute([$userId, $role]);

        Response::json(null, 'All notifications marked as read.');
    }
}
