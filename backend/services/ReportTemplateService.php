<?php
/**
 * Official Philippine Municipal Report Printable / PDF Generator Service
 * Renders official government-templated reports for the City Government of La Carlota.
 */

class ReportTemplateService {
    /**
     * Get Base64 Encoded City Logo
     */
    public static function getLogoBase64(): string {
        static $cachedLogo = null;
        if ($cachedLogo !== null) {
            return $cachedLogo;
        }

        $paths = [
            dirname(__DIR__, 2) . '/web/src/assets/logo.png',
            dirname(__DIR__, 2) . '/web/public/logo.png',
            dirname(__DIR__) . '/uploads/logo.png'
        ];

        foreach ($paths as $path) {
            if (file_exists($path)) {
                $data = file_get_contents($path);
                $cachedLogo = 'data:image/png;base64,' . base64_encode($data);
                return $cachedLogo;
            }
        }

        return '';
    }

    /**
     * Render Full Printable / Save-to-PDF Report Document
     */
    public static function renderDocument(array $doc): string {
        $title = htmlspecialchars($doc['title'] ?? 'OFFICIAL GOVERNMENT REPORT');
        $subtitle = htmlspecialchars($doc['subtitle'] ?? 'City Government of La Carlota - E-Peddlers Regulatory Platform');
        $refNo = htmlspecialchars($doc['ref_no'] ?? ('LCC-RPT-' . date('Ymd-His')));
        $period = htmlspecialchars($doc['period'] ?? ('As of ' . date('F d, Y')));
        $generatedBy = htmlspecialchars($doc['generated_by'] ?? 'System Administrator');
        $generatedAt = date('F d, Y - h:i A');
        $orientation = ($doc['orientation'] ?? 'landscape') === 'portrait' ? 'portrait' : 'landscape';
        $autoprint = !empty($doc['autoprint']);
        $csvUrl = htmlspecialchars($doc['csv_url'] ?? '#');
        $logoBase64 = self::getLogoBase64();

        // Render KPI metric chips
        $kpiHtml = '';
        if (!empty($doc['kpis']) && is_array($doc['kpis'])) {
            $kpiHtml .= '<div class="kpi-grid">';
            foreach ($doc['kpis'] as $kpi) {
                $label = htmlspecialchars($kpi['label'] ?? '');
                $val = htmlspecialchars($kpi['value'] ?? '0');
                $sub = htmlspecialchars($kpi['sub'] ?? '');
                $kpiHtml .= "
                  <div class=\"kpi-card\">
                    <div class=\"kpi-label\">{$label}</div>
                    <div class=\"kpi-value\">{$val}</div>
                    " . ($sub ? "<div class=\"kpi-sub\">{$sub}</div>" : "") . "
                  </div>";
            }
            $kpiHtml .= '</div>';
        }

        // Render Table Columns
        $columns = $doc['columns'] ?? [];
        $colHeadersHtml = '';
        foreach ($columns as $col) {
            $align = $col['align'] ?? 'left';
            $width = isset($col['width']) ? "style=\"width: {$col['width']}; text-align: {$align};\"" : "style=\"text-align: {$align};\"";
            $colHeadersHtml .= "<th {$width}>" . htmlspecialchars($col['label']) . "</th>";
        }

        // Render Table Rows
        $rows = $doc['rows'] ?? [];
        $rowsHtml = '';
        if (empty($rows)) {
            $colSpan = max(1, count($columns));
            $rowsHtml = "<tr><td colspan=\"{$colSpan}\" style=\"text-align:center; padding: 28px; color: #64748b; font-style: italic;\">No records found matching the specified report criteria.</td></tr>";
        } else {
            foreach ($rows as $idx => $r) {
                $zebra = ($idx % 2 === 1) ? ' class="zebra"' : '';
                $rowsHtml .= "<tr{$zebra}>";
                foreach ($columns as $col) {
                    $key = $col['key'];
                    $align = $col['align'] ?? 'left';
                    $raw = $r[$key] ?? '';

                    // Check for custom cell HTML formatting or raw HTML tags
                    if (isset($col['format']) && is_callable($col['format'])) {
                        $formattedVal = $col['format']($raw, $r);
                    } elseif (!empty($col['raw']) || (is_string($raw) && (strpos($raw, '<span') !== false || strpos($raw, '<div') !== false || strpos($raw, '<strong') !== false || strpos($raw, '<em') !== false))) {
                        $formattedVal = (string)$raw;
                    } else {
                        $formattedVal = htmlspecialchars((string)$raw);
                    }

                    $style = "text-align: {$align};";
                    if (isset($col['mono']) && $col['mono']) {
                        $style .= " font-family: 'Consolas', 'Courier New', monospace; font-weight: 600;";
                    }

                    $rowsHtml .= "<td style=\"{$style}\">{$formattedVal}</td>";
                }
                $rowsHtml .= "</tr>";
            }
        }

        // Render Table Summary Totals Footer
        $footerHtml = '';
        if (!empty($doc['totals']) && is_array($doc['totals'])) {
            $footerHtml .= "<tr class=\"totals-row\">";
            foreach ($columns as $idx => $col) {
                $key = $col['key'];
                $align = $col['align'] ?? 'left';
                $style = "text-align: {$align};";
                $val = $doc['totals'][$key] ?? '';
                if ($val !== '') {
                    $formattedTotal = (is_string($val) && (strpos($val, '<span') !== false || strpos($val, '<div') !== false)) 
                        ? (string)$val 
                        : htmlspecialchars((string)$val);
                    $footerHtml .= "<td style=\"{$style}\">{$formattedTotal}</td>";
                } else {
                    $footerHtml .= "<td></td>";
                }
            }
            $footerHtml .= "</tr>";
        }

        // Render Signatories
        $signatories = $doc['signatories'] ?? [
            [
                'title' => 'PREPARED BY',
                'name' => $generatedBy,
                'role' => 'Administrative Licensing Officer'
            ]
        ];

        $signatoriesHtml = '<div class="signatory-section">';
        foreach ($signatories as $sig) {
            $sigTitle = htmlspecialchars($sig['title'] ?? 'NOTED BY');
            $sigName = htmlspecialchars($sig['name'] ?? 'OFFICIAL SIGNATORY');
            $sigRole = htmlspecialchars($sig['role'] ?? 'Office of the City Mayor');
            $signatoriesHtml .= "
              <div class=\"signatory-box\">
                <div class=\"sig-title\">{$sigTitle}</div>
                <div class=\"sig-space\"></div>
                <div class=\"sig-name\">{$sigName}</div>
                <div class=\"sig-role\">{$sigRole}</div>
              </div>";
        }
        $signatoriesHtml .= '</div>';

        $autoprintScript = $autoprint ? "<script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };</script>" : "";

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$title} - {$refNo}</title>
  <style>
    @page {
      size: A4 {$orientation};
      margin: 10mm 12mm 12mm 12mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .report-page {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      tr {
        page-break-inside: avoid;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #475569;
      color: #0f172a;
      line-height: 1.4;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }

    /* Fixed Action Toolbar */
    .toolbar {
      position: fixed;
      top: 14px;
      right: 20px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      padding: 8px 14px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    }
    .toolbar button, .toolbar a {
      background: #059669;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease;
    }
    .toolbar button:hover, .toolbar a:hover {
      background: #047857;
    }
    .toolbar a.btn-csv {
      background: #0284c7;
    }
    .toolbar a.btn-csv:hover {
      background: #0369a1;
    }
    .toolbar button.btn-close {
      background: #334155;
    }
    .toolbar button.btn-close:hover {
      background: #1e293b;
    }

    /* Report Page Shell */
    .report-page {
      background: #ffffff;
      width: 100%;
      max-width: 1120px;
      padding: 36px 42px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      position: relative;
      margin-bottom: 30px;
    }

    /* Official Letterhead Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2.5px solid #065f46;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-logo {
      width: 82px;
      vertical-align: middle;
      text-align: center;
      padding-right: 14px;
    }
    .header-logo img {
      width: 76px;
      height: 76px;
      object-fit: contain;
    }
    .header-titles {
      vertical-align: middle;
      text-align: left;
    }
    .header-titles .republic {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }
    .header-titles .province {
      font-size: 12px;
      font-weight: 700;
      color: #065f46;
      letter-spacing: 0.8px;
    }
    .header-titles .city {
      font-family: 'Times New Roman', Times, serif;
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 2px;
      margin: 1px 0;
    }
    .header-titles .office {
      font-size: 11.5px;
      font-weight: 700;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header-ref-box {
      width: 220px;
      vertical-align: middle;
      text-align: right;
      font-size: 10px;
      color: #475569;
      line-height: 1.45;
    }
    .header-ref-box .doc-badge {
      display: inline-block;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 3px 8px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 10px;
      font-weight: 700;
      border-radius: 4px;
      margin-bottom: 4px;
    }

    /* Report Title & Metadata Banner */
    .title-banner {
      margin-bottom: 18px;
      background: #f8fafc;
      border-left: 4px solid #059669;
      padding: 10px 16px;
      border-radius: 0 6px 6px 0;
    }
    .title-banner h1 {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .title-banner p {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 10.5px;
      color: #334155;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #cbd5e1;
    }
    .meta-bar span strong {
      color: #0f172a;
    }

    /* KPI Summary Cards */
    .kpi-grid {
      display: flex;
      gap: 12px;
      margin-bottom: 18px;
    }
    .kpi-card {
      flex: 1;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-top: 3px solid #059669;
      border-radius: 6px;
      padding: 10px 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .kpi-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .kpi-value {
      font-size: 17px;
      font-weight: 800;
      color: #065f46;
      font-family: 'Consolas', 'Courier New', monospace;
      margin: 3px 0 1px;
    }
    .kpi-sub {
      font-size: 9.5px;
      color: #94a3b8;
    }

    /* Ledger Data Table */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-bottom: 22px;
    }
    table.data-table th {
      background: #065f46;
      color: #ffffff;
      font-weight: 700;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 7px 8px;
      border: 1px solid #047857;
      white-space: nowrap;
    }
    table.data-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: middle;
    }
    table.data-table tr.zebra td {
      background: #f8fafc;
    }
    table.data-table tr.totals-row td {
      background: #ecfdf5;
      font-weight: 800;
      color: #065f46;
      border-top: 2px solid #059669;
      border-bottom: 2px solid #059669;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 11px;
    }

    /* Status Badges */
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-info { background: #e0f2fe; color: #0369a1; }
    .badge-slate { background: #f1f5f9; color: #475569; }

    /* Signatories Block */
    .signatory-section {
      display: flex;
      justify-content: flex-start;
      gap: 30px;
      margin-top: 32px;
      page-break-inside: avoid;
    }
    .signatory-box {
      width: 280px;
      text-align: left;
    }
    .sig-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.8px;
      margin-bottom: 24px;
    }
    .sig-space {
      height: 1px;
      border-bottom: 1px solid #0f172a;
      width: 100%;
      margin: 0 0 6px 0;
    }
    .sig-name {
      font-size: 11.5px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
    }
    .sig-role {
      font-size: 9.5px;
      color: #475569;
      margin-top: 1px;
    }

    /* Document Footer */
    .doc-footer {
      margin-top: 28px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      font-size: 8.5px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <!-- Floating Action Toolbar (Hidden during Print) -->
  <div class="toolbar no-print">
    <button onclick="window.print()">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Print / Save as PDF
    </button>
    <a href="{$csvUrl}" class="btn-csv" target="_blank" download>
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      Download CSV
    </a>
    <button class="btn-close" onclick="window.close()">Close</button>
  </div>

  <div class="report-page">
    <!-- Header Letterhead -->
    <table class="header-table">
      <tr>
        <td class="header-logo">
          <img src="{$logoBase64}" alt="City of La Carlota Official Seal">
        </td>
        <td class="header-titles">
          <div class="republic">Republic of the Philippines</div>
          <div class="province">Province of Negros Occidental</div>
          <div class="city">CITY OF LA CARLOTA</div>
          <div class="office">Office of the City Administrator &bull; Business Permits and Licensing Division</div>
        </td>
        <td class="header-ref-box">
          <div class="doc-badge">{$refNo}</div>
          <div><strong>Date:</strong> {$generatedAt}</div>
          <div><strong>Scope:</strong> {$period}</div>
        </td>
      </tr>
    </table>

    <!-- Title Banner -->
    <div class="title-banner">
      <h1>{$title}</h1>
      <p>{$subtitle}</p>
      <div class="meta-bar">
        <span><strong>Reporting Scope:</strong> {$period}</span>
        <span><strong>Generated By:</strong> {$generatedBy}</span>
        <span><strong>Total Records:</strong> <?= count(\$rows) ?></span>
      </div>
    </div>

    <!-- Executive KPI Summary -->
    {$kpiHtml}

    <!-- Tabular Data Ledger -->
    <table class="data-table">
      <thead>
        <tr>
          {$colHeadersHtml}
        </tr>
      </thead>
      <tbody>
        {$rowsHtml}
        {$footerHtml}
      </tbody>
    </table>

    <!-- Official Signatory Block -->
    {$signatoriesHtml}

    <!-- Document Footer -->
    <div class="doc-footer">
      <div>City Government of La Carlota &bull; Official Digital Regulatory System Document &bull; E-Peddlers Portal</div>
      <div>Reference Code: {$refNo} &bull; Generated: {$generatedAt} &bull; Page 1 of 1</div>
    </div>
  </div>

  {$autoprintScript}
</body>
</html>
HTML;
    }
}
