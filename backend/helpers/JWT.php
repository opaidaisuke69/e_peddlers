<?php
/**
 * Lightweight JSON Web Token (JWT) Helper
 * Supports HS256 algorithm with timing-attack resistant signature checks.
 */

class JWT {
    public static function encode(array $payload, string $secret, int $expirySeconds = 86400): string {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];

        $issuedAt = time();
        $payload['iat'] = $issuedAt;
        $payload['exp'] = $issuedAt + $expirySeconds;

        $base64Header = self::base64UrlEncode(json_encode($header));
        $base64Payload = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', "$base64Header.$base64Payload", $secret, true);
        $base64Signature = self::base64UrlEncode($signature);

        return "$base64Header.$base64Payload.$base64Signature";
    }

    public static function decode(string $token, string $secret): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        list($base64Header, $base64Payload, $base64Signature) = $parts;

        $header = json_decode(self::base64UrlDecode($base64Header), true);
        if (!$header || ($header['alg'] ?? '') !== 'HS256') {
            return null;
        }

        $signature = self::base64UrlDecode($base64Signature);
        $expectedSignature = hash_hmac('sha256', "$base64Header.$base64Payload", $secret, true);

        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($base64Payload), true);
        if (!$payload) {
            return null;
        }

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null; // Expired
        }

        return $payload;
    }

    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
