<?php
/**
 * Audit Trail and Activity Logger Helper
 */

class Logger {
    public static function log(
        ?int $userId,
        ?string $roleName,
        string $action,
        ?string $entityType = null,
        ?string $entityId = null,
        ?array $details = null,
        string $platform = 'web'
    ): void {
        try {
            $pdo = Database::getConnection();
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $jsonDetails = $details !== null ? json_encode($details, JSON_UNESCAPED_UNICODE) : null;

            $stmt = $pdo->prepare("
                INSERT INTO activity_logs (user_id, role_name, action, entity_type, entity_id, details, ip_address, platform)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $userId,
                $roleName,
                $action,
                $entityType,
                $entityId,
                $jsonDetails,
                $ip,
                $platform,
            ]);
        } catch (Exception $e) {
            error_log("Failed to write activity log: " . $e->getMessage());
        }
    }
}
