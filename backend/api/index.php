<?php
/**
 * REST API Front Controller & Bootstrap Entry Point
 */

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', '0');

// Handle CORS
require_once dirname(__DIR__) . '/config/cors.php';
handleCors();

// Global Exception & Fatal Error JSON Handler
set_exception_handler(function (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_type' => get_class($e),
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
});

// Serve static uploaded files directly if requested
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (strpos($requestUri, '/uploads/') !== false) {
    $uploadPath = dirname(__DIR__) . substr($requestUri, strpos($requestUri, '/uploads/'));
    if (file_exists($uploadPath) && is_file($uploadPath)) {
        $mime = mime_content_type($uploadPath) ?: 'application/octet-stream';
        header("Content-Type: $mime");
        readfile($uploadPath);
        exit;
    }
}

// Autoload Core Classes
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/JWT.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/CodeGenerator.php';
require_once dirname(__DIR__) . '/helpers/Logger.php';

// Middleware
require_once dirname(__DIR__) . '/middleware/AuthMiddleware.php';
require_once dirname(__DIR__) . '/middleware/PlatformMiddleware.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';

// Services
require_once dirname(__DIR__) . '/services/FeeCalculatorService.php';
require_once dirname(__DIR__) . '/services/PayMongoService.php';
require_once dirname(__DIR__) . '/services/EmailService.php';
require_once dirname(__DIR__) . '/services/SocketService.php';
require_once dirname(__DIR__) . '/services/PdfService.php';

// Controllers
require_once dirname(__DIR__) . '/controllers/AuthController.php';
require_once dirname(__DIR__) . '/controllers/ApplicationController.php';
require_once dirname(__DIR__) . '/controllers/ApprovalWorkflowController.php';
require_once dirname(__DIR__) . '/controllers/PaymentController.php';
require_once dirname(__DIR__) . '/controllers/PermitReleaseController.php';
require_once dirname(__DIR__) . '/controllers/ArkabalaController.php';
require_once dirname(__DIR__) . '/controllers/ViolationController.php';
require_once dirname(__DIR__) . '/controllers/FeeManagementController.php';
require_once dirname(__DIR__) . '/controllers/DashboardController.php';
require_once dirname(__DIR__) . '/controllers/ReportController.php';
require_once dirname(__DIR__) . '/controllers/NotificationController.php';
require_once dirname(__DIR__) . '/controllers/ActivityLogController.php';
require_once dirname(__DIR__) . '/controllers/VendorMappingController.php';

// Router
require_once dirname(__DIR__) . '/routes/api.php';

// Dispatch
Router::dispatch();
