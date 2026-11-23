<?php
/**
 * REST API Router Dispatcher
 */

class Router {
    private static array $routes = [];

    public static function get(string $path, $handler): void {
        self::$routes['GET'][$path] = $handler;
    }

    public static function post(string $path, $handler): void {
        self::$routes['POST'][$path] = $handler;
    }

    public static function put(string $path, $handler): void {
        self::$routes['PUT'][$path] = $handler;
    }

    public static function patch(string $path, $handler): void {
        self::$routes['PATCH'][$path] = $handler;
    }

    public static function delete(string $path, $handler): void {
        self::$routes['DELETE'][$path] = $handler;
    }

    public static function dispatch(): void {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        // Normalize URI: if '/api' segment is present, take the path after '/api'
        $apiPos = strpos($uri, '/api');
        if ($apiPos !== false) {
            $uri = substr($uri, $apiPos + 4);
        } elseif (basename($_SERVER['SCRIPT_NAME'] ?? '') === 'index.php') {
            $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
            if ($scriptDir !== '/' && strpos($uri, $scriptDir) === 0) {
                $uri = substr($uri, strlen($scriptDir));
            }
        }
        $uri = '/' . trim($uri, '/');

        $routesForMethod = self::$routes[$method] ?? [];

        foreach ($routesForMethod as $routePattern => $handler) {
            // Replace {param} with regex pattern
            $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $routePattern);
            $pattern = '#^' . $pattern . '$#';

            if (preg_match($pattern, $uri, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

                if (is_array($handler)) {
                    list($controller, $action) = $handler;
                    call_user_func_array([$controller, $action], array_values($params));
                } else {
                    call_user_func_array($handler, array_values($params));
                }
                return;
            }
        }

        Response::error("API endpoint not found: [$method] $uri", 404);
    }
}

// ---------------- Route Definitions ----------------

// System Health
Router::get('/', function() {
    Response::json([
        'system' => 'e-Peddlers REST API',
        'city' => 'City of La Carlota',
        'status' => 'operational',
        'version' => '1.0.0',
        'timestamp' => date('c'),
    ]);
});

// Authentication
Router::post('/auth/staff-login', [AuthController::class, 'staffLogin']);
Router::post('/auth/peddler/login', [AuthController::class, 'peddlerLogin']);
Router::post('/auth/peddler/otp-request', [AuthController::class, 'peddlerRequestOtp']);
Router::post('/auth/peddler/otp-verify', [AuthController::class, 'peddlerVerifyOtp']);
Router::get('/auth/me', [AuthController::class, 'me']);

// User Management (Admin)
Router::get('/users', [AuthController::class, 'listUsers']);
Router::post('/users', [AuthController::class, 'createUser']);
Router::put('/users/{id}', [AuthController::class, 'updateUser']);
Router::delete('/users/{id}', [AuthController::class, 'deleteUser']);
Router::patch('/users/{id}/status', [AuthController::class, 'updateUserStatus']);

// Dashboard Metrics
Router::get('/dashboard', [DashboardController::class, 'getMetrics']);

// Saturday Market Vendor Mapping (300 Slots)
Router::get('/vendor-map/slots', [VendorMappingController::class, 'getSlots']);
Router::put('/vendor-map/slots/{id}', [VendorMappingController::class, 'updateSlot']);
Router::post('/vendor-map/slots/batch', [VendorMappingController::class, 'batchUpdate']);
Router::get('/vendor-map/peddlers', [VendorMappingController::class, 'getPeddlers']);

// Applications
Router::get('/applications/track', [ApplicationController::class, 'track']);
Router::get('/applications', [ApplicationController::class, 'index']);
Router::post('/applications', [ApplicationController::class, 'store']);
Router::get('/applications/renewal-info', [ApplicationController::class, 'getPeddlerRenewalInfo']);
Router::get('/applications/peddler-renewal-info', [ApplicationController::class, 'getPeddlerRenewalInfo']);
Router::get('/applications/renewal-search', [ApplicationController::class, 'searchForRenewal']);
Router::get('/applications/search-renewal', [ApplicationController::class, 'searchForRenewal']);
Router::post('/applications/upload-document', [ApplicationController::class, 'uploadDocument']);
Router::get('/applications/{id}', [ApplicationController::class, 'show']);
Router::post('/applications/{id}/resubmit', [ApplicationController::class, 'resubmit']);
Router::delete('/applications/{id}', [ApplicationController::class, 'destroy']);

// Sequential Approval Workflow
Router::post('/applications/{id}/admin-decision', [ApprovalWorkflowController::class, 'adminDecision']);
Router::post('/applications/{id}/inspector-decision', [ApprovalWorkflowController::class, 'inspectorDecision']);
Router::post('/applications/{id}/sanitary-decision', [ApprovalWorkflowController::class, 'sanitaryDecision']);

// Payments & Treasury
Router::get('/applications/{id}/fee-breakdown', [PaymentController::class, 'getFeeBreakdown']);
Router::post('/applications/{id}/paymongo-qrph', [PaymentController::class, 'createPayMongoQrPh']);
Router::post('/applications/{id}/simulate-paymongo', [PaymentController::class, 'simulatePayMongoPayment']);
Router::post('/applications/{id}/verify-online-payment', [PaymentController::class, 'verifyOnlinePayment']);
Router::post('/applications/{id}/cash-payment', [PaymentController::class, 'recordCashPayment']);
Router::post('/applications/{id}/reject-payment', [PaymentController::class, 'rejectPayment']);
Router::post('/webhooks/paymongo', [PaymentController::class, 'handleWebhook']);

// Permit Release
Router::post('/applications/{id}/release-permit', [PermitReleaseController::class, 'releasePermit']);
Router::get('/permits/{id}/view', [PermitReleaseController::class, 'viewPermit']);
Router::get('/peddlers/{id}/qr-code', [PermitReleaseController::class, 'getQrCode']);

// Arkabala Weekly Collection
Router::get('/arkabala/scan', [ArkabalaController::class, 'scanPeddlerQr']);
Router::post('/arkabala/collect', [ArkabalaController::class, 'recordCollection']);
Router::get('/arkabala/weeks', [ArkabalaController::class, 'listWeeks']);
Router::get('/arkabala/collections', [ArkabalaController::class, 'listCollections']);
Router::post('/arkabala/reconcile', [ArkabalaController::class, 'reconcileCollections']);

// Violations
Router::get('/violations/types', [ViolationController::class, 'listTypes']);
Router::get('/violations', [ViolationController::class, 'index']);
Router::post('/violations', [ViolationController::class, 'store']);
Router::post('/violations/{id}/paymongo-qrph', [ViolationController::class, 'createPayMongoQrPh']);
Router::post('/violations/{id}/simulate-paymongo', [ViolationController::class, 'simulatePayMongoPayment']);
Router::post('/violations/{id}/settle', [ViolationController::class, 'settleViolation']);

// Fee Schedule Management
Router::get('/fees', [FeeManagementController::class, 'index']);
Router::post('/fees', [FeeManagementController::class, 'store']);
Router::put('/fees/{id}', [FeeManagementController::class, 'update']);
Router::patch('/fees/{id}/toggle', [FeeManagementController::class, 'toggleActive']);

// Administrative & Treasury Reports
Router::get('/reports/collections', [ReportController::class, 'collectionReport']);
Router::get('/reports/revenue', [ReportController::class, 'collectionReport']);
Router::get('/reports/applications', [ReportController::class, 'applicationReport']);
Router::get('/reports/market-stalls', [ReportController::class, 'marketStallReport']);
Router::get('/reports/peddlers', [ReportController::class, 'peddlerReport']);
Router::get('/reports/activity-logs', [ReportController::class, 'activityLogReport']);

// Notifications
Router::get('/notifications', [NotificationController::class, 'index']);
Router::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
Router::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

// Activity Logs
Router::get('/activity-logs', [ActivityLogController::class, 'index']);
