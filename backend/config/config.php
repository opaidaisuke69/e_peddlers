<?php
/**
 * Configuration Loader for e-Peddlers
 */

// Load .env file if exists
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val, " \t\n\r\0\x0B\"'");
            $_ENV[$key] = $val;
            putenv("$key=$val");
        }
    }
}

if (!function_exists('env')) {
    function env($key, $default = null) {
        if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
            return $_ENV[$key];
        }
        $val = getenv($key);
        if ($val !== false && $val !== '') {
            return $val;
        }
        return $default;
    }
}

// Timezone
date_default_timezone_set(env('TIMEZONE', 'Asia/Manila'));

return [
    'app_name' => env('APP_NAME', 'e-Peddlers – La Carlota City'),
    'app_env' => env('APP_ENV', 'development'),
    'app_url' => env('APP_URL', 'http://localhost:8000'),
    'frontend_url' => env('FRONTEND_WEB_URL', 'http://localhost:5173'),
    'timezone' => env('TIMEZONE', 'Asia/Manila'),

    'db' => [
        'host' => env('DB_HOST', '127.0.0.1'),
        'port' => env('DB_PORT', 3306),
        'name' => env('DB_NAME', 'e_peddlers'),
        'user' => env('DB_USER', 'root'),
        'pass' => env('DB_PASS', ''),
    ],

    'jwt' => [
        'secret' => env('JWT_SECRET', 'epeddlers_lacarlota_super_secure_jwt_secret_key_2026_x99a!'),
        'expire_seconds' => (int)env('JWT_EXPIRE_SECONDS', 86400),
    ],

    'paymongo' => [
        'secret_key' => env('PAYMONGO_SECRET_KEY', 'sk_test_placeholder'),
        'public_key' => env('PAYMONGO_PUBLIC_KEY', 'pk_test_placeholder'),
        'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET', 'whsec_placeholder'),
        'base_url' => env('PAYMONGO_BASE_URL', 'https://api.paymongo.com/v1'),
    ],

    'smtp' => [
        'host' => env('SMTP_HOST', 'smtp.gmail.com'),
        'port' => (int)env('SMTP_PORT', 465),
        'user' => env('SMTP_USER', ''),
        'pass' => env('SMTP_PASS', ''),
        'from' => env('SMTP_FROM', 'noreply@lacarlota.gov.ph'),
        'from_name' => env('SMTP_FROM_NAME', 'e-Peddlers La Carlota City'),
        'enabled' => (bool)env('SMTP_ENABLED', false),
    ],

    'socket_io' => [
        'url' => env('SOCKET_IO_URL', 'http://localhost:3001'),
    ],
];
