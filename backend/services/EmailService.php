<?php
/**
 * Email Notification Service (PHPMailer / HTML Templates)
 */

class EmailService {
    public static function getBaseTemplate(string $title, string $bodyContent): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{$title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #064e3b 0%, #059669 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 24px; line-height: 1.6; font-size: 15px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin: 12px 0; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-info { background: #e0f2fe; color: #0369a1; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; }
    .card-title { font-weight: 600; font-size: 14px; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; }
    .btn { display: inline-block; background: #059669; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>e-Peddlers</h1>
      <p>City of La Carlota &bull; Business Permits and Licensing Office</p>
    </div>
    <div class="content">
      {$bodyContent}
    </div>
    <div class="footer">
      <p>This is an automated advisory from the City Government of La Carlota, Negros Occidental.<br>Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
HTML;
    }

    /**
     * Native Socket SMTP Client with SSL/TLS support (zero external dependencies)
     */
    private static function sendSmtp(array $smtp, string $to, string $subject, string $htmlBody, ?string &$error = null): bool {
        $host = $smtp['host'] ?? 'smtp.gmail.com';
        $port = (int)($smtp['port'] ?? 465);
        $user = $smtp['user'] ?? '';
        $pass = $smtp['pass'] ?? '';
        $from = $smtp['from'] ?? $user;
        $fromName = $smtp['from_name'] ?? 'e-Peddlers La Carlota City';

        $isSsl = ($port === 465);
        $prefix = $isSsl ? 'ssl://' : 'tcp://';
        $timeout = 10;

        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
            ]
        ]);

        $socket = @stream_socket_client("{$prefix}{$host}:{$port}", $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);
        if (!$socket) {
            $error = "Socket connection failed: $errstr ($errno)";
            return false;
        }

        $read = function() use ($socket) {
            $data = '';
            while ($line = fgets($socket, 515)) {
                $data .= $line;
                if (isset($line[3]) && $line[3] === ' ') break;
            }
            return $data;
        };

        $write = function(string $cmd) use ($socket) {
            fputs($socket, $cmd . "\r\n");
        };

        $read(); // greeting

        $write("EHLO " . (gethostname() ?: 'localhost'));
        $read();

        // STARTTLS on port 587
        if (!$isSsl && $port === 587) {
            $write("STARTTLS");
            $read();
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                $error = "TLS handshake failed";
                fclose($socket);
                return false;
            }
            $write("EHLO " . (gethostname() ?: 'localhost'));
            $read();
        }

        // Authenticate
        if (!empty($user) && !empty($pass)) {
            $write("AUTH LOGIN");
            $authResp = $read();
            if (strpos($authResp, '334') === false) {
                $error = "AUTH LOGIN not accepted: $authResp";
                fclose($socket);
                return false;
            }

            $write(base64_encode($user));
            $read();
            $write(base64_encode($pass));
            $passResp = $read();

            if (strpos($passResp, '235') === false) {
                $error = "SMTP Authentication failed: $passResp";
                fclose($socket);
                return false;
            }
        }

        $write("MAIL FROM: <{$from}>");
        $mailResp = $read();
        if (strpos($mailResp, '250') === false) {
            $error = "MAIL FROM rejected: $mailResp";
            fclose($socket);
            return false;
        }

        $write("RCPT TO: <{$to}>");
        $rcptResp = $read();
        if (strpos($rcptResp, '250') === false && strpos($rcptResp, '251') === false) {
            $error = "RCPT TO rejected: $rcptResp";
            fclose($socket);
            return false;
        }

        $write("DATA");
        $dataPrompt = $read();
        if (strpos($dataPrompt, '354') === false) {
            $error = "DATA prompt rejected: $dataPrompt";
            fclose($socket);
            return false;
        }

        $encodedSubject = function_exists('mb_encode_mimeheader')
            ? mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n")
            : "=?UTF-8?B?" . base64_encode($subject) . "?=";

        // Base64-encode body and split into RFC-compliant 76-character lines.
        // Prevents SMTP servers (Exim/Postfix) from rejecting messages with "lines too long for transport (limit 2048)".
        $encodedBody = rtrim(chunk_split(base64_encode($htmlBody), 76, "\r\n"));

        $headers = [
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "Content-Transfer-Encoding: base64",
            "From: {$fromName} <{$from}>",
            "To: <{$to}>",
            "Subject: {$encodedSubject}",
            "Date: " . date('r'),
            "X-Mailer: e-Peddlers Mailer"
        ];

        fputs($socket, implode("\r\n", $headers) . "\r\n\r\n");
        fputs($socket, $encodedBody . "\r\n.\r\n");
        $finalResp = $read();

        $write("QUIT");
        fclose($socket);

        if (strpos($finalResp, '250') === false) {
            $error = "Message rejected by server: $finalResp";
            return false;
        }

        return true;
    }

    public static function send(string $recipientEmail, string $subject, string $htmlBody): bool {
        $pdo = Database::getConnection();

        $config = require dirname(__DIR__) . '/config/config.php';
        $smtpConfig = $config['smtp'] ?? [];
        $smtpEnabled = !empty($smtpConfig['enabled']) && !empty($smtpConfig['user']);

        // Wrap bare snippet inside official template if not already a full HTML document
        if (stripos($htmlBody, '<html') === false) {
            $htmlBody = self::getBaseTemplate($subject, $htmlBody);
        }

        $status = 'SENT';
        $errorMessage = null;

        if ($smtpEnabled) {
            $sent = self::sendSmtp($smtpConfig, $recipientEmail, $subject, $htmlBody, $errorMessage);
            if (!$sent) {
                $status = 'FAILED';
                error_log("Failed to deliver email to {$recipientEmail}: {$errorMessage}");
            }
        }

        // Log to email_logs table
        try {
            $stmt = $pdo->prepare("
                INSERT INTO email_logs (recipient_email, subject, body_html, status, error_message)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$recipientEmail, $subject, $htmlBody, $status, $errorMessage]);
        } catch (Exception $e) {
            error_log("Failed to log email: " . $e->getMessage());
        }

        return ($status === 'SENT');
    }

    public static function notifyApplicationSubmitted(array $app): void {
        $content = "
            <h2>Permit Application Received</h2>
            <p>Dear <strong>{$app['first_name']} {$app['last_name']}</strong>,</p>
            <p>Your business permit application has been successfully submitted to the City of La Carlota.</p>
            <div class='card'>
                <div class='card-title'>Application Summary</div>
                <p><strong>Application Number:</strong> {$app['application_number']}<br>
                <strong>Business Nature:</strong> {$app['nature_of_business']}<br>
                <strong>Date Filed:</strong> {$app['date_of_application']}<br>
                <strong>Current Status:</strong> <span class='badge badge-info'>PENDING ADMIN REVIEW</span></p>
            </div>
            <p>Our administrators are currently reviewing your documents. You will receive an update once your application moves to the field inspection phase.</p>
        ";
        self::send($app['email'], "Permit Application Submitted - {$app['application_number']}", self::getBaseTemplate("Application Submitted", $content));
    }

    public static function notifyAdminApproved(array $app, string $peddlerId): void {
        $config = require dirname(__DIR__) . '/config/config.php';
        $frontendUrl = rtrim($config['frontend_url'] ?? 'http://localhost:5173', '/');
        $loginUrl = $frontendUrl . '/peddler-login';

        $fullName = htmlspecialchars(trim("{$app['first_name']} {$app['last_name']}"));
        $appNum = htmlspecialchars($app['application_number']);
        $nature = htmlspecialchars($app['nature_of_business'] ?? 'Street / Market Vendor');

        $content = "
            <div style='text-align: center; margin-bottom: 24px;'>
                <span class='badge badge-success' style='font-size: 13px; padding: 6px 18px; text-transform: uppercase;'>Application Approved</span>
                <h2 style='color: #064e3b; margin: 12px 0 6px 0; font-size: 24px;'>Congratulations, {$fullName}!</h2>
                <p style='color: #475569; margin: 0; font-size: 15px;'>Your business permit application (<strong>{$appNum}</strong>) has been <strong style='color: #047857;'>APPROVED</strong> by the City Administrator.</p>
            </div>

            <!-- Peddler ID Display Card -->
            <div style='background: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0;'>
                <div style='font-size: 12px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 1px;'>Your Official Peddler ID for Login</div>
                <div style='font-family: monospace; font-size: 30px; font-weight: 800; color: #064e3b; letter-spacing: 2px; margin: 8px 0;'>
                    {$peddlerId}
                </div>
                <p style='margin: 4px 0 0 0; font-size: 13px; color: #065f46;'>
                    Keep this Peddler ID safe. You will use it to log in to your account.
                </p>
            </div>

            <!-- Instructions Card -->
            <div class='card' style='border-left: 4px solid #059669;'>
                <div class='card-title' style='color: #065f46;'>How to Log In to Your Account</div>
                <ol style='margin: 8px 0 0 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.8;'>
                    <li>Click the <strong>Log in with Peddler ID</strong> button below (or visit <a href='{$loginUrl}' style='color: #059669; font-weight: 600;'>{$loginUrl}</a>).</li>
                    <li>Enter your Peddler ID: <strong style='font-family: monospace; color: #064e3b; font-size: 15px;'>{$peddlerId}</strong>.</li>
                    <li>Access your peddler dashboard to track the next inspection stages, monitor clearances, and print your verified permit proof once released.</li>
                </ol>
            </div>

            <!-- Action Button -->
            <div style='text-align: center; margin: 30px 0 24px 0;'>
                <a href='{$loginUrl}' class='btn' style='background: #059669; color: #ffffff; padding: 14px 34px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);'>
                    Log in with Peddler ID &rarr;
                </a>
            </div>

            <!-- Next Steps -->
            <div style='border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; font-size: 13px; color: #64748b;'>
                <p style='margin: 0;'><strong>What's Next?</strong> Your application has progressed to <strong>Stage 2: Field Inspection</strong>. Our municipal inspector will verify your stall and compliance. You will receive further updates as your permit moves through each municipal approval stage.</p>
            </div>
        ";

        self::send(
            $app['email'],
            "Application Approved! Your Peddler ID for Login: {$peddlerId}",
            self::getBaseTemplate("Application Approved - e-Peddlers", $content)
        );
    }

    public static function notifyRejected(array $app, string $stageName, string $reason): void {
        $content = "
            <h2>Application Requires Revision</h2>
            <p>Dear <strong>{$app['first_name']} {$app['last_name']}</strong>,</p>
            <p>Your application <strong>{$app['application_number']}</strong> was returned by <strong>{$stageName}</strong> for corrections.</p>
            <div class='card' style='border-left: 4px solid #ef4444;'>
                <div class='card-title' style='color: #b91c1c;'>Reason for Return</div>
                <p style='color: #1e293b; font-weight: 500;'>{$reason}</p>
            </div>
            <p>Please log in to your e-Peddlers portal using your Peddler ID or Application ID to update the required documents and resubmit.</p>
        ";
        self::send($app['email'], "Action Required: Application {$app['application_number']} Returned", self::getBaseTemplate("Application Returned", $content));
    }

    public static function notifyInspectorApproved(array $app): void {
        $content = "
            <h2>Field Inspection Passed</h2>
            <p>Dear <strong>{$app['first_name']} {$app['last_name']}</strong>,</p>
            <p>Your field inspection has been <span class='badge badge-success'>APPROVED</span> by the Field Inspector. Price tags, product samples, and clearance comply with city ordinances.</p>
            <p>Your application has now progressed to <strong>Sanitary Inspection</strong>.</p>
        ";
        self::send($app['email'], "Field Inspection Approved - {$app['application_number']}", self::getBaseTemplate("Inspection Approved", $content));
    }

    public static function notifySanitaryApproved(array $app): void {
        $content = "
            <h2>Sanitary Compliance Approved</h2>
            <p>Dear <strong>{$app['first_name']} {$app['last_name']}</strong>,</p>
            <p>Your sanitary and health documentation has been <span class='badge badge-success'>APPROVED</span> by the City Health Office.</p>
            <p>Your application is now at the <strong>City Treasury</strong> for payment assessment and official receipt issuance.</p>
        ";
        self::send($app['email'], "Sanitary Inspection Approved - {$app['application_number']}", self::getBaseTemplate("Sanitary Approved", $content));
    }

    public static function notifyPaymentVerified(array $app, string $orNumber, float $amount): void {
        $formatted = number_format($amount, 2);
        $content = "
            <h2>Payment Verified</h2>
            <p>Dear <strong>{$app['first_name']} {$app['last_name']}</strong>,</p>
            <p>The City Treasury has verified your permit payment.</p>
            <div class='card'>
                <div class='card-title'>Official Receipt Details</div>
                <p><strong>OR Number:</strong> {$orNumber}<br>
                <strong>Total Amount:</strong> ₱{$formatted}<br>
                <strong>Status:</strong> <span class='badge badge-success'>VERIFIED</span></p>
            </div>
            <p>Your application is now queued for final <strong>Permit Release</strong> by the City Administrator.</p>
        ";
        self::send($app['email'], "Payment Verified - OR #{$orNumber}", self::getBaseTemplate("Payment Verified", $content));
    }

    public static function notifyPermitReleased(array $app, string $permitNumber): void {
        $content = "
            <h2>Permit Verification Proof Released!</h2>
            <p>Dear <strong>{$app['first_name']} {$app['last_name']}</strong>,</p>
            <p>Congratulations! Your peddler application <strong>{$permitNumber}</strong> has been officially verified and approved by the City Government of La Carlota.</p>
            <div class='card'>
                <div class='card-title'>Verification Ref No.</div>
                <h3 style='color: #15803d; margin: 4px 0;'>{$permitNumber}</h3>
                <p>Your official Arkabala QR Code is now <strong>ACTIVATED</strong>. Present this QR code to the field inspector during collections.</p>
            </div>
            <p>You may now log in to e-Peddlers to download and print your Verification Proof. Note: This serves as verification proof that you are approved; official business permits are issued by the City Mayor's Office / BPLO at City Hall.</p>
        ";
        self::send($app['email'], "Permit Released - {$permitNumber}", self::getBaseTemplate("Permit Released", $content));
    }

    public static function notifyViolationIssued(array $app, string $violationNumber, string $type, float $penalty, string $desc): void {
        $formatted = number_format($penalty, 2);
        $content = "
            <h2>Notice of Violation Issued</h2>
            <p>Dear <strong>{$app['first_name']} {$app['last_name']}</strong>,</p>
            <p>A notice of violation has been recorded by the field inspection team.</p>
            <div class='card' style='border-left: 4px solid #ef4444;'>
                <div class='card-title' style='color: #b91c1c;'>Violation Notice #{$violationNumber}</div>
                <p><strong>Violation Type:</strong> {$type}<br>
                <strong>Penalty Amount:</strong> ₱{$formatted}<br>
                <strong>Details:</strong> {$desc}</p>
            </div>
            <p>Please settle this violation with the City Treasury or via your e-Peddlers portal to maintain active permit standing.</p>
        ";
        self::send($app['email'], "Notice of Violation - {$violationNumber}", self::getBaseTemplate("Notice of Violation", $content));
    }
}
