<?php
/**
 * Role-Based Access Control (RBAC) Middleware
 */

class RoleMiddleware {
    public static function authorize(array $user, array $allowedRoles): void {
        $userRole = strtolower($user['role_name'] ?? '');

        $allowed = array_map('strtolower', $allowedRoles);

        if (!in_array($userRole, $allowed)) {
            Response::error('Forbidden: You do not have the required permissions to perform this action.', 403);
        }
    }
}
