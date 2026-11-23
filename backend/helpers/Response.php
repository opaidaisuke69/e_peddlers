<?php
/**
 * Standardized JSON API Response Helper
 */

class Response {
    public static function json($data = null, string $message = 'Success', int $statusCode = 200, array $meta = []): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

        $response = [
            'success' => $statusCode >= 200 && $statusCode < 300,
            'message' => $message,
            'data' => $data,
        ];

        if (!empty($meta)) {
            $response['meta'] = $meta;
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $message = 'An error occurred', int $statusCode = 400, $errors = null): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

        $response = [
            'success' => false,
            'message' => $message,
            'data' => null,
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function paginate($items, int $total, int $page, int $perPage, string $message = 'Data retrieved'): void {
        $lastPage = $perPage > 0 ? (int)ceil($total / $perPage) : 1;
        self::json($items, $message, 200, [
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => $lastPage,
                'has_more' => $page < $lastPage,
            ]
        ]);
    }
}
