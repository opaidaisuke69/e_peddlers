<?php
/**
 * Authentication Middleware
 */

class AuthMiddleware {
    public static function authenticate(): array {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');

        $token = null;
        if (!empty($authHeader) && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $token = trim($matches[1]);
        } elseif (!empty($_GET['token'])) {
            $candidate = trim($_GET['token']);
            if ($candidate !== '' && $candidate !== 'undefined' && $candidate !== 'null') {
                $token = $candidate;
            }
        }

        if (!$token) {
            Response::error('Authentication token required.', 401);
        }
        $config = require dirname(__DIR__) . '/config/config.php';
        $payload = JWT::decode($token, $config['jwt']['secret']);

        if (!$payload) {
            Response::error('Invalid or expired authentication token.', 401);
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT u.*, r.name AS role_name, r.display_name AS role_display_name, r.allowed_platforms
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = ? AND u.status = 'active'
            LIMIT 1
        ");
        $stmt->execute([$payload['user_id']]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('User account not found or has been deactivated.', 403);
        }

        return $user;
    }
}
