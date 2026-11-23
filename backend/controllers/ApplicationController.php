<?php
/**
 * Permit Application Controller
 * Handles Multi-step application submission (New & Renewal), document uploads,
 * signature capture, fee calculation snapshots, searching, filtering, and resubmissions.
 */

class ApplicationController {
    /**
     * Public Application Tracking (No Authentication Required)
     * Allows applicants to check their clearance status by Application Number or Peddler ID
     */
    public static function track(): void {
        $search = trim($_GET['search'] ?? $_GET['reference'] ?? $_GET['q'] ?? '');
        if (empty($search)) {
            Response::error('Please enter an Application Number or Peddler ID.', 400);
        }

        $pdo = Database::getConnection();

        $cleanSearch = strtoupper(str_replace([' ', '-'], '', $search));

        // 1. Exact match first (Application Number or Peddler Code, with/without formatting)
        $sql = "
            SELECT pa.id, pa.application_number, pa.application_type, pa.status, pa.current_stage,
                   pa.first_name, pa.middle_name, pa.last_name,
                   CONCAT(pa.first_name, ' ', IFNULL(CONCAT(pa.middle_name, ' '), ''), pa.last_name) AS applicant_full_name,
                   pa.nature_of_business, pa.business_address, pa.business_barangay, pa.residential_barangay,
                   pa.business_barangay AS barangay,
                   pa.rejection_reason, pa.created_at,
                   p.peddler_code, p.is_qr_active,
                   fs.total_amount
            FROM permit_applications pa
            LEFT JOIN peddlers p ON pa.peddler_id = p.id
            LEFT JOIN fee_snapshots fs ON fs.id = (SELECT id FROM fee_snapshots WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            WHERE pa.application_number = ? 
               OR p.peddler_code = ?
               OR REPLACE(REPLACE(pa.application_number, '-', ''), ' ', '') = ?
               OR REPLACE(REPLACE(p.peddler_code, '-', ''), ' ', '') = ?
            ORDER BY pa.id DESC
            LIMIT 1
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$search, $search, $cleanSearch, $cleanSearch]);
        $app = $stmt->fetch();

        // 2. Case-insensitive / partial fallback
        if (!$app) {
            $term = "%{$cleanSearch}%";
            $sqlPartial = "
                SELECT pa.id, pa.application_number, pa.application_type, pa.status, pa.current_stage,
                       pa.first_name, pa.middle_name, pa.last_name,
                       CONCAT(pa.first_name, ' ', IFNULL(CONCAT(pa.middle_name, ' '), ''), pa.last_name) AS applicant_full_name,
                       pa.nature_of_business, pa.business_address, pa.business_barangay, pa.residential_barangay,
                       pa.business_barangay AS barangay,
                       pa.rejection_reason, pa.created_at,
                       p.peddler_code, p.is_qr_active,
                       fs.total_amount
                FROM permit_applications pa
                LEFT JOIN peddlers p ON pa.peddler_id = p.id
                LEFT JOIN fee_snapshots fs ON fs.id = (SELECT id FROM fee_snapshots WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
                WHERE REPLACE(REPLACE(UPPER(pa.application_number), '-', ''), ' ', '') LIKE ? 
                   OR REPLACE(REPLACE(UPPER(p.peddler_code), '-', ''), ' ', '') LIKE ?
                ORDER BY pa.id DESC
                LIMIT 1
            ";
            $stmtPartial = $pdo->prepare($sqlPartial);
            $stmtPartial->execute([$term, $term]);
            $app = $stmtPartial->fetch();
        }

        if (!$app) {
            Response::error("No application record found matching '{$search}'. Please verify your reference number.", 404);
        }

        Response::json($app, 'Application tracking record retrieved successfully.');
    }

    /**
     * List Applications with Search, Filtering, and Pagination
     */
    public static function index(): void {
        $search = trim($_GET['search'] ?? '');

        // If no auth header is present and search is given, delegate to public track
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (empty($authHeader) && !empty($search)) {
            self::track();
            return;
        }

        $user = AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $role = strtolower($user['role_name']);
        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $type = trim($_GET['type'] ?? '');
        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = max(1, min(100, (int)($_GET['per_page'] ?? 15)));
        $offset = ($page - 1) * $perPage;

        $conditions = ["1=1"];
        $params = [];

        // Role-based visibility
        if ($role === 'peddler') {
            // Peddler only sees their own applications
            if (!empty($user['peddler_id'])) {
                $conditions[] = "(pa.email = ? OR p.peddler_code = ?)";
                $params[] = $user['email'];
                $params[] = $user['peddler_id'];
            } else {
                $conditions[] = "pa.email = ?";
                $params[] = $user['email'];
            }
        } elseif ($role === 'inspector') {
            // Inspector primarily sees pending inspector approval or all for tracking
            if ($status === 'pending_only') {
                $conditions[] = "pa.status = 'PENDING_INSPECTOR_APPROVAL'";
            }
        } elseif ($role === 'sanitary') {
            // Sanitary primarily sees pending sanitary approval
            if ($status === 'pending_only') {
                $conditions[] = "pa.status = 'PENDING_SANITARY_APPROVAL'";
            }
        } elseif ($role === 'treasury') {
            // Treasury primarily sees pending payment or payment verification
            if ($status === 'pending_only') {
                $conditions[] = "pa.status = 'PENDING_TREASURY_PAYMENT'";
            }
        }

        if (!empty($status) && $status !== 'pending_only') {
            $conditions[] = "pa.status = ?";
            $params[] = $status;
        }

        if (!empty($type)) {
            $conditions[] = "pa.application_type = ?";
            $params[] = $type;
        }

        if (!empty($search)) {
            $conditions[] = "(pa.application_number LIKE ? OR pa.first_name LIKE ? OR pa.last_name LIKE ? OR CONCAT(pa.first_name, ' ', pa.last_name) LIKE ? OR pa.nature_of_business LIKE ? OR p.peddler_code LIKE ? OR pp.or_number LIKE ? OR pm.permit_number LIKE ?)";
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        $whereClause = implode(" AND ", $conditions);

        // Count total
        $countSql = "
            SELECT COUNT(*) AS total
            FROM permit_applications pa
            LEFT JOIN peddlers p ON pa.peddler_id = p.id
            LEFT JOIN permit_payments pp ON pp.id = (SELECT id FROM permit_payments WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            LEFT JOIN permits pm ON pm.id = (SELECT id FROM permits WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            WHERE {$whereClause}
        ";
        $stmtCount = $pdo->prepare($countSql);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetch()['total'];

        // Fetch records
        $sql = "
            SELECT pa.*, p.peddler_code, p.is_qr_active,
                   CONCAT(pa.first_name, ' ', IFNULL(CONCAT(pa.middle_name, ' '), ''), pa.last_name) AS applicant_full_name,
                   fs.total_amount, fs.subtotal, fs.penalty_amount,
                   pp.status AS payment_status, pp.payment_method, pp.or_number, pp.amount_paid, pp.remarks AS payment_remarks,
                   pm.permit_number, pm.valid_from, pm.valid_until
            FROM permit_applications pa
            LEFT JOIN peddlers p ON pa.peddler_id = p.id
            LEFT JOIN fee_snapshots fs ON fs.id = (SELECT id FROM fee_snapshots WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            LEFT JOIN permit_payments pp ON pp.id = (SELECT id FROM permit_payments WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            LEFT JOIN permits pm ON pm.id = (SELECT id FROM permits WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            WHERE {$whereClause}
            ORDER BY pa.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $apps = $stmt->fetchAll();

        Response::paginate($apps, $total, $page, $perPage, 'Applications retrieved.');
    }

    /**
     * Get Application Details with full documents, fee snapshot, timeline history, and signature
     */
    public static function show(int $id): void {
        $user = AuthMiddleware::authenticate();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT pa.*, p.peddler_code, p.is_qr_active,
                   CONCAT(pa.first_name, ' ', IFNULL(CONCAT(pa.middle_name, ' '), ''), pa.last_name) AS applicant_full_name,
                   fs.fee_breakdown, fs.subtotal, fs.penalty_amount, fs.total_amount,
                   pp.status AS payment_status, pp.payment_method, pp.or_number, pp.amount_paid, pp.remarks AS payment_remarks, pp.amount_paid, pp.verified_at,
                   pm.permit_number, pm.valid_from, pm.valid_until, pm.qr_code_token
            FROM permit_applications pa
            LEFT JOIN peddlers p ON pa.peddler_id = p.id
            LEFT JOIN fee_snapshots fs ON fs.id = (SELECT id FROM fee_snapshots WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            LEFT JOIN permit_payments pp ON pp.id = (SELECT id FROM permit_payments WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            LEFT JOIN permits pm ON pm.id = (SELECT id FROM permits WHERE application_id = pa.id ORDER BY id DESC LIMIT 1)
            WHERE pa.id = ?
            LIMIT 1
        ");
        $stmt->execute([$id]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application not found.', 404);
        }

        // Documents
        $stmtDocs = $pdo->prepare("SELECT * FROM application_documents WHERE application_id = ? ORDER BY id ASC");
        $stmtDocs->execute([$id]);
        $docs = $stmtDocs->fetchAll();

        // Signature
        $stmtSig = $pdo->prepare("SELECT signature_data, signed_at FROM application_signatures WHERE application_id = ? LIMIT 1");
        $stmtSig->execute([$id]);
        $sig = $stmtSig->fetch();

        // Timeline History
        $stmtHist = $pdo->prepare("SELECT * FROM application_history WHERE application_id = ? ORDER BY id ASC");
        $stmtHist->execute([$id]);
        $history = $stmtHist->fetchAll();

        if ($app['fee_breakdown']) {
            $app['fee_breakdown'] = json_decode($app['fee_breakdown'], true);
        }

        $app['documents'] = $docs;
        $app['signature'] = $sig;
        $app['timeline'] = $history;

        Response::json($app, 'Application details retrieved.');
    }

    /**
     * Submit Multi-Step Application (New or Renewal)
     */
    public static function store(): void {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $validator = Validator::make($input, [
            'application_type' => 'required|in:New,Renewal',
            'first_name' => 'required',
            'last_name' => 'required',
            'gender' => 'required|in:Male,Female',
            'civil_status' => 'required',
            'residential_address' => 'required',
            'residential_barangay' => 'required',
            'email' => 'required|email',
            'phone' => 'required',
            'nature_of_business' => 'required',
            'business_address' => 'required',
            'business_barangay' => 'required',
            'emergency_contact_person' => 'required',
            'emergency_contact_phone' => 'required',
            'agreed_to_terms' => 'required',
        ]);

        if ($validator->fails()) {
            Response::error($validator->firstError(), 422, $validator->errors());
        }

        if (empty($input['agreed_to_terms'])) {
            Response::error('You must read and agree to the Pagsulundan (Terms and Conditions) before submitting.', 422);
        }

        if (empty($input['signature_data'])) {
            Response::error('Applicant signature is required before submitting.', 422);
        }

        // Validate 4 mandatory compliance documents
        $requiredDocTypes = [
            'barangay_clearance' => 'Barangay Clearance',
            'price_tag' => 'Price Tag Photo',
            'sample_products' => 'Sample Products Photo',
            'government_id' => 'Valid ID / CTC',
        ];

        $uploadedTypes = [];
        if (!empty($input['documents']) && is_array($input['documents'])) {
            foreach ($input['documents'] as $doc) {
                if (!empty($doc['document_type'])) {
                    $uploadedTypes[] = $doc['document_type'];
                }
            }
        }

        $missingDocs = [];
        foreach ($requiredDocTypes as $docKey => $docLabel) {
            if (!in_array($docKey, $uploadedTypes)) {
                $missingDocs[] = $docLabel;
            }
        }

        if (!empty($missingDocs)) {
            Response::error('Please upload all required compliance documents: ' . implode(', ', $missingDocs) . '.', 422);
        }

        $pdo = Database::getConnection();
        $pdo->beginTransaction();

        try {
            $appNumber = CodeGenerator::generateApplicationNumber($pdo);
            $numPapag = max(0, (int)($input['num_papag'] ?? 0));
            $numLagIt = max(0, (int)($input['num_lag_it'] ?? 0));
            $isRenewal = ($input['application_type'] === 'Renewal');
            $peddlerId = !empty($input['peddler_id']) ? (int)$input['peddler_id'] : null;
            $assignedSlot = !empty($input['assigned_slot']) ? trim($input['assigned_slot']) : null;

            // Validate slot availability for New applicants
            if (!$isRenewal && !empty($assignedSlot)) {
                $stmtSlotCheck = $pdo->prepare("SELECT status FROM market_slots WHERE slot_code = ? LIMIT 1");
                $stmtSlotCheck->execute([$assignedSlot]);
                $slotRow = $stmtSlotCheck->fetch();
                if ($slotRow && $slotRow['status'] !== 'AVAILABLE') {
                    Response::error("The selected stall slot '{$assignedSlot}' is currently {$slotRow['status']} and cannot be selected. Please choose an Available slot from the map.", 422);
                }
            }

            // Renewal Validations & Business Rule Enforcement
            $isLateRenewal = false;
            if ($isRenewal) {
                // Check if Renewal by peddler_code
                if (empty($peddlerId) && !empty($input['existing_peddler_code'])) {
                    $stmtP = $pdo->prepare("SELECT id FROM peddlers WHERE peddler_code = ? LIMIT 1");
                    $stmtP->execute([trim($input['existing_peddler_code'])]);
                    $pRow = $stmtP->fetch();
                    if ($pRow) {
                        $peddlerId = (int)$pRow['id'];
                    }
                }

                if (!$peddlerId) {
                    Response::error('Existing peddler record not found for renewal.', 422);
                }

                // Check prior permit
                $stmtPrev = $pdo->prepare("SELECT * FROM permits WHERE peddler_id = ? ORDER BY id DESC LIMIT 1");
                $stmtPrev->execute([$peddlerId]);
                $prevPermit = $stmtPrev->fetch();
                if (!$prevPermit) {
                    Response::error('No prior permit found for this peddler. Please apply as New.', 422);
                }

                // Verify permit is expired (Permits valid until Dec 31; renewal starts Jan 1)
                $prevValidUntil = !empty($prevPermit['valid_until']) ? strtotime($prevPermit['valid_until'] . ' 23:59:59') : 0;
                $isExpired = ($prevValidUntil < time()) || ($prevPermit['status'] === 'expired');
                if (!$isExpired) {
                    $expStr = date('F d, Y', $prevValidUntil);
                    $expYear = (int)date('Y', $prevValidUntil);
                    Response::error("Cannot renew yet: Your current permit ({$prevPermit['permit_number']}) is ACTIVE and valid until {$expStr}. Renewal begins on January 1, " . ($expYear + 1) . " after your permit has expired.", 422);
                }

                // Verify they haven't already renewed for the current year
                $currentYear = (int)date('Y');
                $stmtCheckActive = $pdo->prepare("
                    SELECT permit_number FROM permits WHERE peddler_id = ? AND YEAR(valid_until) >= ? AND status = 'active' LIMIT 1
                ");
                $stmtCheckActive->execute([$peddlerId, $currentYear]);
                $activeThisYear = $stmtCheckActive->fetch();
                if ($activeThisYear) {
                    Response::error("You have already renewed your permit ({$activeThisYear['permit_number']}) for {$currentYear}.", 422);
                }

                // Verify no pending renewal application already exists
                $stmtPending = $pdo->prepare("
                    SELECT application_number FROM permit_applications
                    WHERE peddler_id = ? AND application_type = 'Renewal'
                    AND status NOT IN ('FINISHED', 'ADMIN_REJECTED', 'INSPECTOR_REJECTED', 'SANITARY_REJECTED', 'PAYMENT_REJECTED')
                    LIMIT 1
                ");
                $stmtPending->execute([$peddlerId]);
                $pendingRow = $stmtPending->fetch();
                if ($pendingRow) {
                    Response::error("You already have an active renewal application ({$pendingRow['application_number']}) in progress.", 422);
                }

                // Calculate late renewal (Regular renewal is Jan 1 to Jan 31; after Jan 31 is penalized by 1 month late fee)
                $expiredYear = (int)date('Y', $prevValidUntil);
                $targetYear = max($expiredYear + 1, $currentYear);
                $regularEnd = strtotime("{$targetYear}-01-31 23:59:59");
                $isLateRenewal = (time() > $regularEnd);

                // Preserve previous slot if not specified
                if (empty($assignedSlot) && !empty($prevPermit['assigned_slot'])) {
                    $assignedSlot = $prevPermit['assigned_slot'];
                }
            }

            // Insert Application
            $stmt = $pdo->prepare("
                INSERT INTO permit_applications (
                    application_number, peddler_id, application_type, gender, civil_status, ctc_number,
                    date_of_application, last_name, first_name, middle_name, residential_address,
                    residential_barangay, residential_city, email, phone, nature_of_business,
                    business_type, num_employees, business_address, business_barangay, business_city,
                    num_papag, num_lag_it, assigned_slot, emergency_contact_person, emergency_contact_phone,
                    agreed_to_terms, status, current_stage, is_late_renewal
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    1, 'PENDING_ADMIN_APPROVAL', 1, ?
                )
            ");

            $dateOfApp = date('Y-m-d');
            $residentialCity = trim($input['residential_city'] ?? 'La Carlota City');
            $businessCity = trim($input['business_city'] ?? 'La Carlota City');
            $businessType = trim($input['business_type'] ?? 'Peddlers');
            $numEmployees = (int)($input['num_employees'] ?? 0);

            $stmt->execute([
                $appNumber,
                $peddlerId,
                $input['application_type'],
                $input['gender'],
                $input['civil_status'],
                $input['ctc_number'] ?? null,
                $dateOfApp,
                trim($input['last_name']),
                trim($input['first_name']),
                trim($input['middle_name'] ?? ''),
                trim($input['residential_address']),
                trim($input['residential_barangay']),
                $residentialCity,
                trim($input['email']),
                trim($input['phone']),
                trim($input['nature_of_business']),
                $businessType,
                $numEmployees,
                trim($input['business_address']),
                trim($input['business_barangay']),
                $businessCity,
                $numPapag,
                $numLagIt,
                $assignedSlot,
                trim($input['emergency_contact_person']),
                trim($input['emergency_contact_phone']),
                $isLateRenewal ? 1 : 0,
            ]);

            $appId = (int)$pdo->lastInsertId();

            // Reserve market slot if chosen
            if (!empty($assignedSlot)) {
                $stmtSlotReserve = $pdo->prepare("
                    UPDATE market_slots
                    SET status = 'RESERVED', assigned_application_id = ?, notes = ?
                    WHERE slot_code = ?
                ");
                $stmtSlotReserve->execute([$appId, "Under review: App #{$appNumber}", $assignedSlot]);
            }

            // Calculate & save fee snapshot
            $feeCalc = FeeCalculatorService::calculate($numPapag, $numLagIt, $isLateRenewal);
            $stmtFee = $pdo->prepare("
                INSERT INTO fee_snapshots (application_id, fee_breakdown, subtotal, penalty_amount, total_amount)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmtFee->execute([
                $appId,
                json_encode($feeCalc['items'], JSON_UNESCAPED_UNICODE),
                $feeCalc['subtotal'],
                $feeCalc['penalty_amount'],
                $feeCalc['total_amount'],
            ]);

            // Save Signature if provided
            if (!empty($input['signature_data'])) {
                $stmtSig = $pdo->prepare("INSERT INTO application_signatures (application_id, signature_data) VALUES (?, ?)");
                $stmtSig->execute([$appId, $input['signature_data']]);
            }

            // Save Uploaded Documents if passed in payload
            if (!empty($input['documents']) && is_array($input['documents'])) {
                $stmtDoc = $pdo->prepare("
                    INSERT INTO application_documents (application_id, document_type, file_name, file_path, file_type, file_size)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                foreach ($input['documents'] as $doc) {
                    $stmtDoc->execute([
                        $appId,
                        $doc['document_type'] ?? 'other',
                        $doc['file_name'] ?? 'document',
                        $doc['file_path'] ?? '',
                        $doc['file_type'] ?? 'image/jpeg',
                        (int)($doc['file_size'] ?? 1024),
                    ]);
                }
            }

            // Record Timeline History
            $stmtHist = $pdo->prepare("
                INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
                VALUES (?, 'Application Submission', 'PENDING_ADMIN_APPROVAL', ?, 'Applicant', 'Application and required compliance files submitted for administrative verification.')
            ");
            $applicantName = trim($input['first_name'] . ' ' . $input['last_name']);
            $stmtHist->execute([$appId, $applicantName]);

            // If renewal, link previous permit
            if ($isRenewal && !empty($input['previous_permit_number'])) {
                $stmtRen = $pdo->prepare("
                    INSERT INTO application_renewals (application_id, previous_permit_number, late_fee_applied)
                    VALUES (?, ?, ?)
                ");
                $stmtRen->execute([$appId, trim($input['previous_permit_number']), $feeCalc['penalty_amount']]);
            }

            $pdo->commit();

            // Send Confirmation Email
            EmailService::notifyApplicationSubmitted([
                'first_name' => $input['first_name'],
                'last_name' => $input['last_name'],
                'email' => $input['email'],
                'application_number' => $appNumber,
                'nature_of_business' => $input['nature_of_business'],
                'date_of_application' => $dateOfApp,
            ]);

            // Emit Real-time Socket Event & persist notification
            SocketService::emit('application_submitted', [
                'title' => 'New Permit Application Submitted',
                'message' => "Application $appNumber submitted by $applicantName.",
                'reference_id' => $appNumber,
                'type' => 'info',
            ], 'admin');

            Response::json([
                'application_id' => $appId,
                'application_number' => $appNumber,
                'status' => 'PENDING_ADMIN_APPROVAL',
                'fee_summary' => $feeCalc,
            ], 'Application submitted successfully.', 201);

        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Failed to submit application: ' . $e->getMessage(), 500);
        }
    }

    /**
     * File Upload Handler for Documents (Price Tag, Samples, Clearance, ID)
     */
    public static function uploadDocument(): void {
        if (empty($_FILES['file'])) {
            Response::error('No file was uploaded.', 400);
        }

        $file = $_FILES['file'];
        $docType = $_POST['document_type'] ?? 'other';
        $allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

        if (!in_array($file['type'], $allowedTypes)) {
            Response::error('Invalid file format. Allowed formats: JPG, PNG, PDF.', 422);
        }

        if ($file['size'] > 10 * 1024 * 1024) { // 10MB
            Response::error('File size cannot exceed 10MB.', 422);
        }

        $uploadDir = dirname(__DIR__) . '/uploads/documents/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $uniqueName = 'doc_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $destPath = $uploadDir . $uniqueName;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            Response::error('Failed to save uploaded file.', 500);
        }

        $relativeUrl = '/uploads/documents/' . $uniqueName;

        Response::json([
            'file_name' => $file['name'],
            'file_path' => $relativeUrl,
            'file_type' => $file['type'],
            'file_size' => $file['size'],
            'document_type' => $docType,
        ], 'File uploaded successfully.');
    }

    /**
     * Get Peddler's Current Permit and Renewal Eligibility Status
     * Auto-detects the logged-in peddler or allows optional identifier override
     */
    public static function getPeddlerRenewalInfo(): void {
        $user = null;
        try {
            $user = AuthMiddleware::authenticate();
        } catch (Exception $e) {
            // Unauthenticated fallback
        }

        $identifier = trim($_GET['identifier'] ?? '');
        if (empty($identifier) && $user) {
            $identifier = $user['peddler_id'] ?? $user['email'];
        }

        if (empty($identifier)) {
            Response::error('Peddler authentication or identifier required.', 422);
        }

        $pdo = Database::getConnection();

        // Search for peddler & their latest permit
        $stmt = $pdo->prepare("
            SELECT pm.id AS permit_id, pm.permit_number, pm.valid_from, pm.valid_until, pm.status AS permit_status, pm.assigned_slot,
                   p.id AS peddler_id, p.peddler_code, p.first_name, p.middle_name, p.last_name, p.gender,
                   p.civil_status, p.ctc_number, p.phone, p.email, p.business_nature, p.business_type,
                   p.num_employees, p.num_papag, p.num_lag_it,
                   pa.residential_address, pa.residential_barangay, pa.residential_city,
                   pa.business_address, pa.business_barangay, pa.business_city,
                   ec.contact_person AS emergency_contact_person, ec.contact_phone AS emergency_contact_phone
            FROM peddlers p
            LEFT JOIN permits pm ON pm.id = (
                SELECT id FROM permits WHERE peddler_id = p.id ORDER BY id DESC LIMIT 1
            )
            LEFT JOIN peddler_addresses pa ON p.id = pa.peddler_id
            LEFT JOIN emergency_contacts ec ON p.id = ec.peddler_id
            WHERE p.peddler_code = ? OR p.email = ? OR pm.permit_number = ?
            ORDER BY (CASE WHEN p.peddler_code = ? THEN 1 ELSE 0 END) DESC, p.id DESC
            LIMIT 1
        ");
        $stmt->execute([$identifier, $identifier, $identifier, $identifier]);
        $record = $stmt->fetch();

        if (!$record) {
            Response::json([
                'has_record' => false,
                'has_permit' => false,
                'can_renew' => false,
                'message' => 'No peddler record found with identifier: ' . $identifier,
            ], 'No peddler record found.');
        }

        if (empty($record['permit_number'])) {
            Response::json([
                'has_record' => true,
                'has_permit' => false,
                'can_renew' => false,
                'peddler' => $record,
                'message' => "No prior issued permit found for peddler {$record['peddler_code']}.",
            ], 'No permit found for peddler.');
        }

        // Validity and Expiration Checks
        $validUntilTs = !empty($record['valid_until']) ? strtotime($record['valid_until'] . ' 23:59:59') : 0;
        $isExpired = ($validUntilTs < time()) || (strtolower($record['permit_status']) === 'expired');
        $expDateFormatted = !empty($record['valid_until']) ? date('F d, Y', strtotime($record['valid_until'])) : 'December 31';
        $permitYear = !empty($record['valid_until']) ? (int)date('Y', $validUntilTs) : (int)date('Y');
        $nextYear = $permitYear + 1;
        $currentYear = (int)date('Y');

        // Check if already renewed for current year
        $stmtAlreadyRenewed = $pdo->prepare("
            SELECT id, permit_number, valid_from, valid_until
            FROM permits
            WHERE peddler_id = ? AND YEAR(valid_until) >= ? AND status = 'active'
            LIMIT 1
        ");
        $stmtAlreadyRenewed->execute([$record['peddler_id'], $currentYear]);
        $activeThisYear = $stmtAlreadyRenewed->fetch();

        // Check if pending renewal exists
        $stmtPending = $pdo->prepare("
            SELECT application_number, status, created_at
            FROM permit_applications
            WHERE peddler_id = ? AND application_type = 'Renewal'
            AND status NOT IN ('FINISHED', 'ADMIN_REJECTED', 'INSPECTOR_REJECTED', 'SANITARY_REJECTED', 'PAYMENT_REJECTED')
            ORDER BY id DESC LIMIT 1
        ");
        $stmtPending->execute([$record['peddler_id']]);
        $pendingApp = $stmtPending->fetch();

        // Late fee calculation
        $expiredYear = (int)date('Y', $validUntilTs);
        $targetRenewalYear = max($expiredYear + 1, $currentYear);
        $graceDeadline = strtotime("{$targetRenewalYear}-01-31 23:59:59");
        $isLate = (time() > $graceDeadline);

        $canRenew = $isExpired && empty($activeThisYear) && empty($pendingApp);
        $reason = '';
        if (!$isExpired) {
            $reason = "Your peddler permit ({$record['permit_number']}) is currently ACTIVE and valid until {$expDateFormatted}. Under City Ordinance, permit renewal begins on January 1, {$nextYear} after your permit has expired. You cannot renew an active permit.";
        } elseif (!empty($activeThisYear)) {
            $reason = "You have already renewed your permit ({$activeThisYear['permit_number']}) for calendar year {$currentYear}. It is valid until December 31, {$currentYear}.";
        } elseif (!empty($pendingApp)) {
            $reason = "Renewal application ({$pendingApp['application_number']}) is currently in progress (Status: {$pendingApp['status']}).";
        } else {
            $reason = "Your permit expired on {$expDateFormatted}. You are eligible to file for renewal.";
        }

        $feeCalc = FeeCalculatorService::calculate((int)$record['num_papag'], (int)$record['num_lag_it'], $isLate);

        $record['has_record'] = true;
        $record['has_permit'] = true;
        $record['is_expired'] = $isExpired;
        $record['can_renew'] = $canRenew;
        $record['is_late_renewal'] = $isLate;
        $record['has_already_renewed'] = !empty($activeThisYear);
        $record['already_renewed_permit'] = $activeThisYear;
        $record['has_pending_renewal'] = !empty($pendingApp);
        $record['pending_application'] = $pendingApp;
        $record['renewal_eligibility_message'] = $reason;
        $record['fee_estimate'] = $feeCalc;
        $record['target_renewal_year'] = $targetRenewalYear;
        $record['renewal_start_date'] = "{$targetRenewalYear}-01-01";
        $record['regular_deadline'] = "{$targetRenewalYear}-01-31";
        $record['penalty_note'] = $isLate
            ? 'Late Renewal Surcharge (₱200.00): Application filed after the January 31 deadline (1 month past January 1 renewal opening).'
            : 'On-time renewal: Filed within the January 1 to January 31 regular window.';

        Response::json($record, 'Peddler permit renewal information retrieved.');
    }

    /**
     * Renewal Search: Look up existing Peddler or Permit to pre-populate renewal form
     * Municipal Business Rules:
     * 1. Permits are valid within the calendar year (January 1 to December 31).
     * 2. Renewal starts on January 1.
     * 3. A peddler can ONLY renew if their permit is EXPIRED and they haven't renewed yet for this year.
     * 4. Regular renewal window is 1 month (January 1 to January 31). If renewing after Jan 31, late penalty applies.
     */
    public static function searchForRenewal(): void {
        $identifier = trim($_GET['identifier'] ?? '');
        if (empty($identifier)) {
            Response::error('Please enter a Peddler ID or Permit Number.', 422);
        }

        $pdo = Database::getConnection();

        // Search by permit_number or peddler_code (get latest permit regardless of status)
        $stmt = $pdo->prepare("
            SELECT pm.id AS permit_id, pm.permit_number, pm.valid_from, pm.valid_until, pm.status AS permit_status, pm.assigned_slot,
                   p.id AS peddler_id, p.peddler_code, p.first_name, p.middle_name, p.last_name, p.gender,
                   p.civil_status, p.ctc_number, p.phone, p.email, p.business_nature, p.business_type,
                   p.num_employees, p.num_papag, p.num_lag_it,
                   pa.residential_address, pa.residential_barangay, pa.residential_city,
                   pa.business_address, pa.business_barangay, pa.business_city,
                   ec.contact_person AS emergency_contact_person, ec.contact_phone AS emergency_contact_phone
            FROM peddlers p
            LEFT JOIN permits pm ON p.id = pm.peddler_id
            LEFT JOIN peddler_addresses pa ON p.id = pa.peddler_id
            LEFT JOIN emergency_contacts ec ON p.id = ec.peddler_id
            WHERE p.peddler_code = ? OR pm.permit_number = ?
            ORDER BY pm.id DESC
            LIMIT 1
        ");
        $stmt->execute([$identifier, $identifier]);
        $record = $stmt->fetch();

        if (!$record) {
            Response::error('No existing peddler or permit found with that identifier.', 404);
        }

        if (empty($record['permit_number'])) {
            Response::error("No prior permit found for peddler {$record['peddler_code']}. Please submit a New Permit Application.", 422);
        }

        // Rule 1 & 2: Check if permit is expired
        // Permits expire on December 31. You can renew if your permit is expired and you haven't renewed yet.
        $validUntilTs = !empty($record['valid_until']) ? strtotime($record['valid_until'] . ' 23:59:59') : 0;
        $isExpired = ($validUntilTs < time()) || ($record['permit_status'] === 'expired');

        if (!$isExpired) {
            $expDateFormatted = date('F d, Y', $validUntilTs);
            $permitYear = date('Y', $validUntilTs);
            $nextYear = (int)$permitYear + 1;
            Response::error("Cannot renew yet: Your peddler permit ({$record['permit_number']}) is currently ACTIVE and valid until {$expDateFormatted}. Permit renewal begins on January 1, {$nextYear} after your permit has expired.", 422);
        }

        // Rule 3: Check if already renewed for the current year
        $currentYear = (int)date('Y');
        $stmtAlreadyRenewed = $pdo->prepare("
            SELECT id, permit_number, valid_from, valid_until
            FROM permits
            WHERE peddler_id = ? AND YEAR(valid_until) >= ? AND status = 'active'
            LIMIT 1
        ");
        $stmtAlreadyRenewed->execute([$record['peddler_id'], $currentYear]);
        $activeThisYear = $stmtAlreadyRenewed->fetch();
        if ($activeThisYear) {
            Response::error("You have already renewed your permit ({$activeThisYear['permit_number']}) for {$currentYear}. It is valid until December 31, {$currentYear}.", 422);
        }

        // Check if a pending renewal application is already in progress
        $stmtPending = $pdo->prepare("
            SELECT application_number, status, created_at
            FROM permit_applications
            WHERE peddler_id = ? AND application_type = 'Renewal'
            AND status NOT IN ('FINISHED', 'ADMIN_REJECTED', 'INSPECTOR_REJECTED', 'SANITARY_REJECTED', 'PAYMENT_REJECTED')
            ORDER BY id DESC LIMIT 1
        ");
        $stmtPending->execute([$record['peddler_id']]);
        $pendingApp = $stmtPending->fetch();
        if ($pendingApp) {
            Response::error("You already have an active renewal application ({$pendingApp['application_number']}) currently in progress (Status: {$pendingApp['status']}).", 422);
        }

        // Rule 4: January 1 is start of renewal. If late renewal by 1 month (after January 31), penalize.
        $expiredYear = (int)date('Y', $validUntilTs);
        $targetRenewalYear = max($expiredYear + 1, $currentYear);
        $graceDeadline = strtotime("{$targetRenewalYear}-01-31 23:59:59");
        $isLate = (time() > $graceDeadline);

        $record['is_late_renewal'] = $isLate;
        $feeCalc = FeeCalculatorService::calculate((int)$record['num_papag'], (int)$record['num_lag_it'], $isLate);
        $record['fee_estimate'] = $feeCalc;
        $record['target_renewal_year'] = $targetRenewalYear;
        $record['renewal_start_date'] = "{$targetRenewalYear}-01-01";
        $record['regular_deadline'] = "{$targetRenewalYear}-01-31";
        $record['penalty_note'] = $isLate 
            ? 'Late Renewal Surcharge (₱200.00): Application filed after the January 31 deadline (1 month past January 1 renewal opening).' 
            : 'On-time renewal: Filed within the January 1 to January 31 regular window.';

        Response::json($record, 'Renewal details retrieved.');
    }

    /**
     * Resubmit Application with Corrections
     */
    public static function resubmit(int $id): void {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM permit_applications WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application not found.', 404);
        }

        // Only allow resubmission if in a rejected state
        $rejectedStatuses = ['ADMIN_REJECTED', 'INSPECTOR_REJECTED', 'SANITARY_REJECTED', 'PAYMENT_REJECTED'];
        if (!in_array($app['status'], $rejectedStatuses)) {
            Response::error('Application is not in a rejected state and cannot be resubmitted.', 400);
        }

        // Reset to PENDING_ADMIN_APPROVAL or corresponding stage
        $newStatus = 'PENDING_ADMIN_APPROVAL';
        if ($app['status'] === 'INSPECTOR_REJECTED') {
            $newStatus = 'PENDING_INSPECTOR_APPROVAL';
        } elseif ($app['status'] === 'SANITARY_REJECTED') {
            $newStatus = 'PENDING_SANITARY_APPROVAL';
        } elseif ($app['status'] === 'PAYMENT_REJECTED') {
            $newStatus = 'PENDING_TREASURY_PAYMENT';
        }

        $stmtUpdate = $pdo->prepare("
            UPDATE permit_applications
            SET status = ?, rejection_reason = NULL, updated_at = NOW()
            WHERE id = ?
        ");
        $stmtUpdate->execute([$newStatus, $id]);

        // Append new documents if sent
        if (!empty($input['documents']) && is_array($input['documents'])) {
            $stmtDoc = $pdo->prepare("
                INSERT INTO application_documents (application_id, document_type, file_name, file_path, file_type, file_size)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            foreach ($input['documents'] as $doc) {
                $stmtDoc->execute([
                    $id,
                    $doc['document_type'] ?? 'other',
                    $doc['file_name'] ?? 'document',
                    $doc['file_path'] ?? '',
                    $doc['file_type'] ?? 'image/jpeg',
                    (int)($doc['file_size'] ?? 1024),
                ]);
            }
        }

        // Add history log
        $pdo->prepare("
            INSERT INTO application_history (application_id, stage_name, status, actor_name, actor_role, remarks)
            VALUES (?, 'Resubmission', ?, ?, 'Applicant', ?)
        ")->execute([
            $id,
            $newStatus,
            $app['first_name'] . ' ' . $app['last_name'],
            $input['resubmission_remarks'] ?? 'Corrected compliance documents and information resubmitted.',
        ]);

        Response::json(['status' => $newStatus], 'Application resubmitted successfully.');
    }

    /**
     * Permanently Delete Application (Admin Only)
     */
    public static function destroy(int $id): void {
        $user = AuthMiddleware::authenticate();
        $role = strtolower($user['role_name'] ?? '');

        if ($role !== 'admin') {
            Response::error('Unauthorized. Only administrators can delete application records.', 403);
        }

        $pdo = Database::getConnection();

        // Check if application exists
        $stmt = $pdo->prepare("SELECT * FROM permit_applications WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $app = $stmt->fetch();

        if (!$app) {
            Response::error('Application record not found.', 404);
        }

        $pdo->beginTransaction();
        try {
            $assignedSlot = $app['assigned_slot'] ?? null;

            // Delete the application (database foreign keys cascade to documents, signatures, history, payments, clearances, permits)
            $stmtDel = $pdo->prepare("DELETE FROM permit_applications WHERE id = ?");
            $stmtDel->execute([$id]);

            // If a market slot was assigned, release it back to AVAILABLE if no other active permit or pending application holds it
            if (!empty($assignedSlot)) {
                $checkSlot = $pdo->prepare("
                    SELECT 
                        (SELECT COUNT(*) FROM permit_applications WHERE assigned_slot = ? AND status NOT IN ('REJECTED', 'ADMIN_REJECTED', 'INSPECTOR_REJECTED', 'SANITARY_REJECTED', 'PAYMENT_REJECTED')) AS pending_apps,
                        (SELECT COUNT(*) FROM permits WHERE assigned_slot = ? AND status = 'ACTIVE' AND valid_until >= CURDATE()) AS active_permits
                ");
                $checkSlot->execute([$assignedSlot, $assignedSlot]);
                $slotUsage = $checkSlot->fetch();

                if ((int)$slotUsage['pending_apps'] === 0 && (int)$slotUsage['active_permits'] === 0) {
                    $pdo->prepare("UPDATE market_slots SET status = 'AVAILABLE', notes = NULL WHERE slot_code = ?")->execute([$assignedSlot]);
                }
            }

            Logger::log(
                $user['id'],
                $user['role_name'],
                'APPLICATION_DELETED',
                'permit_applications',
                (string)$id,
                [
                    'application_number' => $app['application_number'],
                    'applicant_name' => trim($app['first_name'] . ' ' . $app['last_name']),
                    'assigned_slot' => $assignedSlot,
                ]
            );

            $pdo->commit();
            Response::json(['deleted_id' => $id, 'application_number' => $app['application_number']], "Application #{$app['application_number']} has been permanently deleted.");
        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Failed to delete application: ' . $e->getMessage(), 500);
        }
    }
}
