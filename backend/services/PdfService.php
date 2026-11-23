<?php
/**
 * Digital Permit & Official Receipt Generator Service
 * Generates official printable HTML / PDF layouts for La Carlota City peddler permits.
 */

class PdfService {
    public static function generatePermitHtml(array $permitData): string {
        $permitNumber = htmlspecialchars($permitData['permit_number'] ?? '');
        $peddlerName = htmlspecialchars($permitData['first_name'] . ' ' . ($permitData['middle_name'] ? $permitData['middle_name'] . ' ' : '') . $permitData['last_name']);
        $businessName = htmlspecialchars($permitData['business_name'] ?? '');
        $businessLocation = htmlspecialchars($permitData['business_location'] ?? '');
        $peddlerCode = htmlspecialchars($permitData['peddler_code'] ?? '');
        $validFrom = date('F d, Y', strtotime($permitData['valid_from'] ?? 'now'));
        $validUntil = date('F d, Y', strtotime($permitData['valid_until'] ?? (date('Y') . '-12-31')));
        $qrToken = htmlspecialchars($permitData['qr_code_token'] ?? '');
        $numPapag = (int)($permitData['num_papag'] ?? 0);
        $numLagIt = (int)($permitData['num_lag_it'] ?? 0);
        $totalUnits = $numPapag + $numLagIt;
        $issuedBy = htmlspecialchars($permitData['released_by_name'] ?? 'City Mayor / BPLO');
        $dateIssued = date('F d, Y', strtotime($permitData['released_at'] ?? 'now'));

        // Generate inline QR code SVG or QR display
        $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" . urlencode($qrToken);

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Peddler Permit Verification Proof - {$permitNumber}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body { font-family: 'Times New Roman', Times, serif; background: #525659; margin: 0; padding: 24px; display: flex; justify-content: center; }
    .page { width: 800px; background: #fff; padding: 48px; box-sizing: border-box; box-shadow: 0 4px 12px rgba(0,0,0,0.25); border: 12px double #047857; position: relative; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 70px; color: rgba(4, 120, 87, 0.05); font-weight: bold; text-transform: uppercase; pointer-events: none; }
    .header { text-align: center; border-bottom: 2px solid #047857; padding-bottom: 16px; margin-bottom: 20px; }
    .republic { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #333; margin: 0; }
    .province { font-size: 14px; color: #047857; font-weight: bold; margin: 2px 0; }
    .city { font-size: 20px; font-weight: bold; color: #0f172a; margin: 4px 0; letter-spacing: 1.5px; }
    .office { font-size: 13px; font-style: italic; color: #475569; margin: 0; }
    .permit-title { text-align: center; margin: 20px 0 14px; }
    .permit-title h2 { font-size: 24px; color: #065f46; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
    .permit-title .number { font-size: 14px; color: #047857; font-weight: bold; margin-top: 4px; font-family: monospace; }
    .content-body { font-size: 14px; line-height: 1.7; color: #1e293b; text-align: justify; margin-bottom: 20px; }
    .peddler-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 18px 24px; margin: 18px 0; display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
    .detail-row { margin-bottom: 8px; }
    .detail-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; font-family: sans-serif; }
    .detail-val { font-size: 14px; font-weight: bold; color: #0f172a; }
    .qr-container { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 1px dashed #cbd5e1; padding-left: 16px; }
    .qr-container img { width: 130px; height: 130px; border: 2px solid #0f172a; padding: 4px; background: #fff; }
    .qr-label { font-size: 10px; font-family: sans-serif; color: #64748b; margin-top: 6px; font-weight: bold; }
    .validity-strip { background: #065f46; color: #fff; text-align: center; padding: 10px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px; margin: 18px 0; }

    .controls { position: fixed; top: 20px; right: 20px; display: flex; gap: 10px; }
    .btn { background: #047857; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
    .btn-close { background: #64748b; }
  </style>
</head>
<body>
  <div class="controls no-print">
    <button class="btn" onclick="window.print()">Print / Save Proof (PDF)</button>
    <button class="btn btn-close" onclick="window.close()">Close Window</button>
  </div>
  <div class="page">
    <div class="watermark">VERIFICATION PROOF</div>
    <div class="header">
      <p class="republic">Republic of the Philippines</p>
      <p class="province">Province of Negros Occidental</p>
      <h1 class="city">CITY OF LA CARLOTA</h1>
      <p class="office">OFFICE OF THE CITY MAYOR &bull; BUSINESS PERMITS &amp; LICENSING DIVISION</p>
    </div>

    <div class="permit-title">
      <h2>PEDDLER PERMIT VERIFICATION PROOF</h2>
      <div class="number">VERIFICATION REF NO: {$permitNumber}</div>
    </div>
    <div class="content-body">
      <p>TO WHOM IT MAY CONCERN:</p>
      <p>This is to certify that the individual named below has successfully completed all municipal verification requirements, passed sanitary and field assessments, and settled corresponding statutory municipal taxes and fees for ambulant/market peddling in the City of La Carlota pursuant to the Revenue Code of the City of La Carlota.</p>
    </div>
    <div class="peddler-box">
      <div>
        <div class="detail-row">
          <div class="detail-label">Registered Peddler</div>
          <div class="detail-val">{$peddlerName}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Peddler System ID</div>
          <div class="detail-val" style="color: #1e3a8a;">{$peddlerCode}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Business Nature &amp; Line</div>
          <div class="detail-val">{$businessName}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Permitted Vending Zone</div>
          <div class="detail-val">{$businessLocation}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Authorized Units</div>
          <div class="detail-val">{$totalUnits} Papag / Lag-it</div>
        </div>
      </div>
      <div class="qr-container">
        <img src="{$qrUrl}" alt="Arkabala Verification QR">
        <div class="qr-label">OFFICIAL ARKABALA QR</div>
        <div style="font-size: 8px; color: #94a3b8; word-break: break-all; margin-top: 2px;">{$qrToken}</div>
      </div>
    </div>
    <div class="validity-strip">
      VALID FROM: {$validFrom} &nbsp;&bull;&nbsp; VALID UNTIL: {$validUntil}
    </div>
    <div style="margin-top: 24px; padding-top: 12px; border-top: 1px dashed #cbd5e1; text-align: center; font-family: sans-serif; line-height: 1.4;">
      <div style="font-size: 9.5px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
        VERIFICATION PROOF &bull; NOT AN OFFICIAL BUSINESS PERMIT
      </div>
      <div style="font-size: 8.5px; color: #94a3b8; margin-top: 2px;">
        This document serves as verified digital proof of compliance and municipal approval. Official physical business permits are issued by the Business Permits &amp; Licensing Office (BPLO) at La Carlota City Hall.
      </div>
      <div style="font-size: 8px; color: #cbd5e1; margin-top: 4px;">
        Digital Registry Verification Record &bull; City Government of La Carlota &bull; BPLO Verification Division
      </div>
    </div>
  </div>
</body>
</html>
HTML;
    }
}
