<?php
/**
 * PHP Built-in Server Router Script
 * Routes all API calls to api/index.php and serves static uploads.
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Serve uploaded static files directly if they exist on disk
if ($uri !== '/' && strpos($uri, '/uploads/') !== false) {
    $filePath = __DIR__ . substr($uri, strpos($uri, '/uploads/'));
    if (file_exists($filePath) && is_file($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimes = [
            'png'  => 'image/png',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif'  => 'image/gif',
            'svg'  => 'image/svg+xml',
            'webp' => 'image/webp',
            'pdf'  => 'application/pdf',
            'txt'  => 'text/plain',
            'json' => 'application/json',
        ];
        $contentType = $mimes[$ext] ?? (function_exists('mime_content_type') ? @mime_content_type($filePath) : null) ?: 'application/octet-stream';

        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, OPTIONS');
        header('Access-Control-Allow-Headers: *');
        header('Content-Type: ' . $contentType);
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: public, max-age=86400');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        readfile($filePath);
        exit;
    }
}

// Route all other requests into the REST API front controller
require_once __DIR__ . '/api/index.php';
