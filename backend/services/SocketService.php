<?php
/**
 * Real-Time Socket.IO Broadcaster & Persistent Notification Service
 */

class SocketService {
    public static function emit(string $event, array $payload, ?string $targetRole = null, ?int $targetUserId = null): void {
        $pdo = Database::getConnection();

        // 1. Persist notification in MySQL database
        try {
            $title = $payload['title'] ?? 'Notification';
            $message = $payload['message'] ?? '';
            $type = $payload['type'] ?? 'info';
            $refId = $payload['reference_id'] ?? null;

            $stmt = $pdo->prepare("
                INSERT INTO notifications (user_id, target_role, title, message, type, reference_id, is_read)
                VALUES (?, ?, ?, ?, ?, ?, 0)
            ");
            $stmt->execute([$targetUserId, $targetRole, $title, $message, $type, $refId]);
        } catch (Exception $e) {
            error_log("Failed to insert notification: " . $e->getMessage());
        }

        // 2. Broadcast via Socket.IO server if running
        $config = require dirname(__DIR__) . '/config/config.php';
        $socketUrl = $config['socket_io']['url'] . '/api/broadcast';

        $body = [
            'event' => $event,
            'target_role' => $targetRole,
            'target_user_id' => $targetUserId,
            'payload' => $payload,
            'timestamp' => date('c'),
        ];

        // Non-blocking broadcast post with short timeout
        $ch = curl_init($socketUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT_MS, 500); // 500ms max so it never delays HTTP response
        @curl_exec($ch);
        @curl_close($ch);
    }
}
