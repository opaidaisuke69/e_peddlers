<?php
/**
 * Platform Access Control Middleware
 * Enforces strict role-based platform access rules:
 * - Admin: Web only
 * - Treasury: Web only
 * - Sanitary: Mobile only
 * - Inspector: Mobile only
 * - Peddler: Both Web and Mobile
 */

class PlatformMiddleware {
    public static function detectPlatform(): string {
        $headers = getallheaders();
        $platform = strtolower($headers['X-Client-Platform'] ?? $headers['x-client-platform'] ?? '');

        if (empty($platform)) {
            // Check query param or user agent
            $platform = strtolower($_GET['platform'] ?? '');
        }

        if ($platform !== 'mobile' && $platform !== 'web') {
            $userAgent = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
            if (strpos($userAgent, 'expo') !== false || strpos($userAgent, 'reactnative') !== false || strpos($userAgent, 'mobile') !== false) {
                $platform = 'mobile';
            } else {
                $platform = 'web';
            }
        }

        return $platform;
    }

    public static function enforce(array $user, ?string $requestPlatform = null): void {
        $platform = $requestPlatform ?: self::detectPlatform();
        $role = strtolower($user['role_name']);

        if ($platform === 'mobile') {
            if ($role === 'admin') {
                Response::error('Access Denied: Admin role is restricted from accessing the mobile application.', 403);
            }
            if ($role === 'treasury') {
                Response::error('Access Denied: Treasury role is restricted from accessing the mobile application.', 403);
            }
            if ($role === 'peddler') {
                Response::error('Access Denied: Peddler accounts are restricted to the Web Application only.', 403);
            }
        }

        if ($platform === 'web') {
            if ($role === 'sanitary') {
                Response::error('Access Denied: Sanitary personnel must use the mobile application.', 403);
            }
            if ($role === 'inspector') {
                Response::error('Access Denied: Inspector personnel must use the mobile application.', 403);
            }
        }
    }
}
