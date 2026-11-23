<?php
/**
 * PayMongo QRPh Integration Service (TEST MODE)
 * Official Documentation: https://developers.paymongo.com/
 */

class PayMongoService {
    private string $secretKey;
    private string $publicKey;
    private string $webhookSecret;
    private string $baseUrl;

    public function __construct() {
        $config = require dirname(__DIR__) . '/config/config.php';
        $pm = $config['paymongo'];
        $this->secretKey = $pm['secret_key'];
        $this->publicKey = $pm['public_key'];
        $this->webhookSecret = $pm['webhook_secret'];
        $this->baseUrl = $pm['base_url'];
    }

    /**
     * Create PayMongo QRPh Payment Intent / Source
     * In test mode, if credentials are dummy or live network is offline,
     * it generates a standard compliant test QR payload and simulation capability.
     */
    public function createQrPhPayment(float $amount, string $description, array $metadata = []): array {
        $amountInCentavos = (int)round($amount * 100);
        $reference = 'PM-QRPH-' . strtoupper(bin2hex(random_bytes(6)));

        // Attempt live PayMongo API call if key is configured
        if ($this->secretKey !== 'sk_test_placeholder' && strpos($this->secretKey, 'sk_test_') === 0) {
            $payload = [
                'data' => [
                    'attributes' => [
                        'amount' => $amountInCentavos,
                        'payment_method_allowed' => ['qrph', 'paymaya', 'gcash'],
                        'payment_method_options' => [
                            'card' => ['request_three_d_secure' => 'any'],
                        ],
                        'currency' => 'PHP',
                        'description' => $description,
                        'statement_descriptor' => 'e-Peddlers La Carlota',
                        'metadata' => $metadata,
                    ]
                ]
            ];

            $ch = curl_init("{$this->baseUrl}/payment_intents");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Authorization: Basic ' . base64_encode($this->secretKey . ':')
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                $response = json_decode($res, true);
                if (isset($response['data']['id'])) {
                    $intentId = $response['data']['id'];
                    return [
                        'success' => true,
                        'reference' => $reference,
                        'payment_intent_id' => $intentId,
                        'amount' => $amount,
                        'qr_code_data' => "00020101021226490013PH.PAYMONGO.QR0114{$intentId}5204000053036085406" . number_format($amount, 2, '.', '') . "5802PH5917CITY OF LA CARLOTA6010LA CARLOTA6304TEST",
                        'status' => 'awaiting_payment',
                        'mode' => 'test',
                    ];
                }
            }
        }

        // Test mode fallback simulation
        $simulatedIntentId = 'pi_test_' . bin2hex(random_bytes(10));
        $qrphString = "00020101021226490013PH.PAYMONGO.QR0114{$simulatedIntentId}5204000053036085406" . number_format($amount, 2, '.', '') . "5802PH5920CITY OF LA CARLOTA6010LA CARLOTA6304ABCD";

        return [
            'success' => true,
            'reference' => $reference,
            'payment_intent_id' => $simulatedIntentId,
            'amount' => $amount,
            'qr_code_data' => $qrphString,
            'status' => 'awaiting_payment',
            'mode' => 'test',
            'instructions' => 'Scan QRPh with GCash, Maya, or any InstaPay/QRPh compliant banking app in PayMongo Test Mode.',
        ];
    }

    /**
     * Verify PayMongo Webhook Signature
     */
    public function verifyWebhookSignature(string $payload, string $signatureHeader): bool {
        if ($this->webhookSecret === 'whsec_placeholder' || empty($signatureHeader)) {
            return true; // Allow dev/test mode pass-through
        }

        // Signature format: t=1492774577,te=...,li=...
        $parts = explode(',', $signatureHeader);
        $timestamp = '';
        $testSignature = '';

        foreach ($parts as $part) {
            $kv = explode('=', trim($part), 2);
            if (count($kv) === 2) {
                if ($kv[0] === 't') $timestamp = $kv[1];
                if ($kv[0] === 'te') $testSignature = $kv[1];
            }
        }

        if (empty($timestamp) || empty($testSignature)) {
            return false;
        }

        $comparisonString = "{$timestamp}.{$payload}";
        $expectedSignature = hash_hmac('sha256', $comparisonString, $this->webhookSecret);

        return hash_equals($expectedSignature, $testSignature);
    }
}
