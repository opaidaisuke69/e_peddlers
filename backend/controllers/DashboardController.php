<?php
/**
 * Dashboard Metrics & Analytics Controller
 * Provides role-specific real-time KPIs, charts, and activity streams for all 5 roles.
 */

class DashboardController {
    /**
     * Unified Dashboard Endpoint - returns analytics based on the authenticated user's role
     */
    public static function getMetrics(): void {
        $user = AuthMiddleware::authenticate();
        $role = strtolower($user['role_name']);

        switch ($role) {
            case 'admin':
                self::adminDashboard($user);
                break;
            case 'treasury':
                self::treasuryDashboard($user);
                break;
            case 'inspector':
                self::inspectorDashboard($user);
                break;
            case 'sanitary':
                self::sanitaryDashboard($user);
                break;
            case 'peddler':
                self::peddlerDashboard($user);
                break;
            default:
                Response::error('Role not recognized.', 403);
        }
    }

    /**
     * Admin Dashboard Metrics (Web)
     */
    private static function adminDashboard(array $user): void {
        $pdo = Database::getConnection();

        // Peddler stats
        $totalPeddlers = (int)$pdo->query("SELECT COUNT(*) FROM peddlers")->fetchColumn();
        $activePeddlers = (int)$pdo->query("SELECT COUNT(*) FROM peddlers WHERE status = 'active'")->fetchColumn();
        $inactivePeddlers = $totalPeddlers - $activePeddlers;

        // Application status breakdown
        $pendingAdmin = (int)$pdo->query("SELECT COUNT(*) FROM permit_applications WHERE status = 'PENDING_ADMIN_APPROVAL'")->fetchColumn();
        $pendingInspector = (int)$pdo->query("SELECT COUNT(*) FROM permit_applications WHERE status = 'PENDING_INSPECTOR_APPROVAL'")->fetchColumn();
        $pendingSanitary = (int)$pdo->query("SELECT COUNT(*) FROM permit_applications WHERE status = 'PENDING_SANITARY_APPROVAL'")->fetchColumn();
        $pendingPayment = (int)$pdo->query("SELECT COUNT(*) FROM permit_applications WHERE status = 'PENDING_TREASURY_PAYMENT'")->fetchColumn();
        $readyRelease = (int)$pdo->query("SELECT COUNT(*) FROM permit_applications WHERE status = 'READY_FOR_PERMIT_RELEASE'")->fetchColumn();
        $finishedPermits = (int)$pdo->query("SELECT COUNT(*) FROM permit_applications WHERE status = 'FINISHED'")->fetchColumn();
        $rejectedApps = (int)$pdo->query("SELECT COUNT(*) FROM permit_applications WHERE status LIKE '%REJECTED%'")->fetchColumn();

        $totalApplications = (int)$pdo->query("SELECT COUNT(*) FROM permit_applications")->fetchColumn();

        // Revenue
        $permitRevenue = (float)$pdo->query("SELECT IFNULL(SUM(amount_paid), 0) FROM permit_payments WHERE status = 'VERIFIED'")->fetchColumn();
        $arkabalaRevenue = (float)$pdo->query("SELECT IFNULL(SUM(amount), 0) FROM arkabala_collections WHERE status = 'PAID'")->fetchColumn();
        $totalViolations = (int)$pdo->query("SELECT COUNT(*) FROM peddler_violations")->fetchColumn();

        // Monthly Permit Revenue Chart Data (Last 6 months)
        $stmtMonthly = $pdo->query("
            SELECT DATE_FORMAT(verified_at, '%b %Y') AS month_label,
                   SUM(amount_paid) AS total_revenue
            FROM permit_payments
            WHERE status = 'VERIFIED' AND verified_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY month_label
            ORDER BY MIN(verified_at) ASC
        ");
        $monthlyRevenue = $stmtMonthly->fetchAll();

        // Weekly Arkabala Chart Data
        $stmtArkabalaChart = $pdo->query("
            SELECT CONCAT('Week ', acw.week_number) AS week_label,
                   IFNULL(SUM(ac.amount), 0) AS total_collected
            FROM arkabala_collection_weeks acw
            LEFT JOIN arkabala_collections ac ON acw.id = ac.collection_week_id AND ac.status = 'PAID'
            GROUP BY acw.id, acw.week_number
            ORDER BY acw.id DESC
            LIMIT 6
        ");
        $weeklyArkabalaChart = array_reverse($stmtArkabalaChart->fetchAll());

        // Status Distribution
        $statusDistribution = [
            ['name' => 'Pending Admin', 'value' => $pendingAdmin, 'color' => '#3b82f6'],
            ['name' => 'Pending Inspector', 'value' => $pendingInspector, 'color' => '#f59e0b'],
            ['name' => 'Pending Sanitary', 'value' => $pendingSanitary, 'color' => '#8b5cf6'],
            ['name' => 'Pending Payment', 'value' => $pendingPayment, 'color' => '#ec4899'],
            ['name' => 'Ready for Release', 'value' => $readyRelease, 'color' => '#06b6d4'],
            ['name' => 'Released / Finished', 'value' => $finishedPermits, 'color' => '#10b981'],
            ['name' => 'Rejected', 'value' => $rejectedApps, 'color' => '#ef4444'],
        ];

        // Recent Activity Stream
        $stmtLogs = $pdo->query("
            SELECT al.*, u.first_name, u.last_name
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.id DESC
            LIMIT 8
        ");
        $recentActivities = $stmtLogs->fetchAll();

        Response::json([
            'summary' => [
                'total_peddlers' => $totalPeddlers,
                'active_peddlers' => $activePeddlers,
                'inactive_peddlers' => $inactivePeddlers,
                'total_applications' => $totalApplications,
                'pending_applications' => $pendingAdmin,
                'pending_inspector' => $pendingInspector,
                'pending_sanitary' => $pendingSanitary,
                'pending_payment' => $pendingPayment,
                'ready_for_release' => $readyRelease,
                'released_permits' => $finishedPermits,
                'rejected_applications' => $rejectedApps,
                'total_permit_revenue' => $permitRevenue,
                'total_arkabala_collections' => $arkabalaRevenue,
                'total_revenue' => $permitRevenue + $arkabalaRevenue,
                'total_violations' => $totalViolations,
            ],
            'charts' => [
                'monthly_revenue' => $monthlyRevenue,
                'weekly_arkabala' => $weeklyArkabalaChart,
                'status_distribution' => $statusDistribution,
            ],
            'recent_activities' => $recentActivities,
        ], 'Admin dashboard metrics retrieved.');
    }

    /**
     * Treasury Dashboard Metrics (Web)
     */
    private static function treasuryDashboard(array $user): void {
        $pdo = Database::getConnection();

        $totalPermitPayments = (int)$pdo->query("SELECT COUNT(*) FROM permit_payments")->fetchColumn();
        $pendingValidation = (int)$pdo->query("SELECT COUNT(*) FROM permit_applications WHERE status = 'PENDING_TREASURY_PAYMENT'")->fetchColumn();
        $verifiedPayments = (int)$pdo->query("SELECT COUNT(*) FROM permit_payments WHERE status = 'VERIFIED'")->fetchColumn();
        $rejectedPayments = (int)$pdo->query("SELECT COUNT(*) FROM permit_payments WHERE status = 'REJECTED'")->fetchColumn();

        // Cash vs Online
        $cashTotal = (float)$pdo->query("SELECT IFNULL(SUM(amount_paid), 0) FROM permit_payments WHERE payment_method = 'CASH' AND status = 'VERIFIED'")->fetchColumn();
        $cashCount = (int)$pdo->query("SELECT COUNT(*) FROM permit_payments WHERE payment_method = 'CASH' AND status = 'VERIFIED'")->fetchColumn();

        $onlineTotal = (float)$pdo->query("SELECT IFNULL(SUM(amount_paid), 0) FROM permit_payments WHERE payment_method = 'PAYMONGO_QRPH' AND status = 'VERIFIED'")->fetchColumn();
        $onlineCount = (int)$pdo->query("SELECT COUNT(*) FROM permit_payments WHERE payment_method = 'PAYMONGO_QRPH' AND status = 'VERIFIED'")->fetchColumn();

        $totalPermitRevenue = $cashTotal + $onlineTotal;
        $totalArkabalaRevenue = (float)$pdo->query("SELECT IFNULL(SUM(amount), 0) FROM arkabala_collections WHERE status = 'PAID'")->fetchColumn();
        $unreconciledArkabala = (int)$pdo->query("SELECT COUNT(*) FROM arkabala_collections WHERE reconciled_by_treasury = 0")->fetchColumn();

        // Recent Payments
        $stmtRecent = $pdo->query("
            SELECT pp.*, pa.application_number, pa.first_name, pa.last_name, pa.nature_of_business
            FROM permit_payments pp
            JOIN permit_applications pa ON pp.application_id = pa.id
            ORDER BY pp.id DESC
            LIMIT 10
        ");
        $recentPayments = $stmtRecent->fetchAll();

        Response::json([
            'summary' => [
                'total_permit_payments' => $totalPermitPayments,
                'pending_validation' => $pendingValidation,
                'verified_payments' => $verifiedPayments,
                'rejected_payments' => $rejectedPayments,
                'cash_revenue' => $cashTotal,
                'cash_count' => $cashCount,
                'online_revenue' => $onlineTotal,
                'online_count' => $onlineCount,
                'total_permit_revenue' => $totalPermitRevenue,
                'total_arkabala_collections' => $totalArkabalaRevenue,
                'grand_total_revenue' => $totalPermitRevenue + $totalArkabalaRevenue,
                'unreconciled_arkabala_records' => $unreconciledArkabala,
            ],
            'recent_payments' => $recentPayments,
        ], 'Treasury dashboard metrics retrieved.');
    }

    /**
     * Inspector Dashboard Metrics (Mobile)
     */
    private static function inspectorDashboard(array $user): void {
        $pdo = Database::getConnection();

        $pendingInspection = (int)$pdo->query("SELECT COUNT(*) FROM permit_applications WHERE status = 'PENDING_INSPECTOR_APPROVAL'")->fetchColumn();
        $approvedInspections = (int)$pdo->query("SELECT COUNT(*) FROM application_approvals WHERE stage = 'INSPECTOR' AND decision = 'APPROVED'")->fetchColumn();
        $rejectedInspections = (int)$pdo->query("SELECT COUNT(*) FROM application_approvals WHERE stage = 'INSPECTOR' AND decision = 'REJECTED'")->fetchColumn();

        $activePeddlers = (int)$pdo->query("SELECT COUNT(*) FROM peddlers WHERE status = 'active'")->fetchColumn();

        // Today's collections
        $today = date('Y-m-d');
        $stmtToday = $pdo->prepare("SELECT IFNULL(SUM(amount), 0) FROM arkabala_collections WHERE collection_date = ? AND status = 'PAID'");
        $stmtToday->execute([$today]);
        $todayArkabala = (float)$stmtToday->fetchColumn();

        // Current week revenue
        $currentWeekRevenue = (float)$pdo->query("
            SELECT IFNULL(SUM(ac.amount), 0)
            FROM arkabala_collections ac
            JOIN arkabala_collection_weeks acw ON ac.collection_week_id = acw.id
            WHERE CURDATE() BETWEEN acw.start_date AND acw.end_date
            AND ac.status = 'PAID'
        ")->fetchColumn();

        $totalViolations = (int)$pdo->query("SELECT COUNT(*) FROM peddler_violations")->fetchColumn();

        // Unpaid peddlers for current week
        $stmtUnpaid = $pdo->query("
            SELECT COUNT(*) FROM peddlers p
            WHERE p.status = 'active'
            AND NOT EXISTS (
                SELECT 1 FROM arkabala_collections ac
                JOIN arkabala_collection_weeks acw ON ac.collection_week_id = acw.id
                WHERE ac.peddler_id = p.id AND CURDATE() BETWEEN acw.start_date AND acw.end_date AND ac.status = 'PAID'
            )
        ");
        $unpaidPeddlersCount = (int)$stmtUnpaid->fetchColumn();

        Response::json([
            'pending_inspections' => $pendingInspection,
            'approved_inspections' => $approvedInspections,
            'rejected_inspections' => $rejectedInspections,
            'total_active_peddlers' => $activePeddlers,
            'today_arkabala' => $todayArkabala,
            'weekly_arkabala_revenue' => $currentWeekRevenue,
            'unpaid_peddlers' => $unpaidPeddlersCount,
            'total_violations' => $totalViolations,
        ], 'Inspector dashboard metrics retrieved.');
    }

    /**
     * Sanitary Dashboard Metrics (Mobile)
     */
    private static function sanitaryDashboard(array $user): void {
        $pdo = Database::getConnection();

        $pendingSanitary = (int)$pdo->query("SELECT COUNT(*) FROM permit_applications WHERE status = 'PENDING_SANITARY_APPROVAL'")->fetchColumn();
        $approvedSanitary = (int)$pdo->query("SELECT COUNT(*) FROM application_approvals WHERE stage = 'SANITARY' AND decision = 'APPROVED'")->fetchColumn();
        $rejectedSanitary = (int)$pdo->query("SELECT COUNT(*) FROM application_approvals WHERE stage = 'SANITARY' AND decision = 'REJECTED'")->fetchColumn();
        $totalInspected = $approvedSanitary + $rejectedSanitary;

        Response::json([
            'pending_inspections' => $pendingSanitary,
            'approved_applications' => $approvedSanitary,
            'rejected_applications' => $rejectedSanitary,
            'total_inspected_peddlers' => $totalInspected,
        ], 'Sanitary dashboard metrics retrieved.');
    }

    /**
     * Peddler Dashboard Metrics (Web & Mobile)
     */
    private static function peddlerDashboard(array $user): void {
        $pdo = Database::getConnection();

        $peddlerCode = $user['peddler_id'] ?? null;
        $email = $user['email'];

        // Get Peddler record
        $stmtP = $pdo->prepare("
            SELECT p.*, pa.residential_address, pa.business_address, pa.business_barangay,
                   pm.permit_number, pm.valid_from, pm.valid_until, pm.status AS permit_status,
                   pq.token AS qr_token, pq.is_active AS qr_active
            FROM peddlers p
            LEFT JOIN peddler_addresses pa ON p.id = pa.peddler_id
            LEFT JOIN permits pm ON pm.id = (
                SELECT id FROM permits WHERE peddler_id = p.id ORDER BY id DESC LIMIT 1
            )
            LEFT JOIN peddler_qr_codes pq ON p.id = pq.peddler_id
            WHERE p.peddler_code = ? OR p.email = ?
            ORDER BY (CASE WHEN p.peddler_code = ? THEN 1 ELSE 0 END) DESC, p.id DESC
            LIMIT 1
        ");
        $stmtP->execute([$peddlerCode, $email, $peddlerCode]);
        $peddler = $stmtP->fetch();

        $peddlerId = $peddler ? (int)$peddler['id'] : 0;

        // Latest Application
        $stmtApp = $pdo->prepare("
            SELECT * FROM permit_applications
            WHERE email = ? OR peddler_id = ?
            ORDER BY id DESC LIMIT 1
        ");
        $stmtApp->execute([$email, $peddlerId]);
        $latestApp = $stmtApp->fetch();

        // Arkabala stats
        $totalArkabalaPaid = 0.0;
        $arkabalaStatus = 'UNPAID';
        $outstandingBalance = 0.0;
        $recentCollections = [];

        if ($peddlerId > 0) {
            $totalArkabalaPaid = (float)$pdo->query("SELECT IFNULL(SUM(amount), 0) FROM arkabala_collections WHERE peddler_id = $peddlerId AND status = 'PAID'")->fetchColumn();

            // Check current week
            $stmtWeek = $pdo->query("SELECT id FROM arkabala_collection_weeks WHERE CURDATE() BETWEEN start_date AND end_date LIMIT 1");
            $currWeek = $stmtWeek->fetch();
            $currWeekId = $currWeek ? (int)$currWeek['id'] : 1;

            $stmtPaidCheck = $pdo->prepare("SELECT 1 FROM arkabala_collections WHERE peddler_id = ? AND collection_week_id = ? AND status = 'PAID'");
            $stmtPaidCheck->execute([$peddlerId, $currWeekId]);
            if ($stmtPaidCheck->fetch()) {
                $arkabalaStatus = 'PAID';
            } else {
                $arkabalaStatus = 'UNPAID';
            }

            // Outstanding balance
            $stmtUnpaid = $pdo->prepare("
                SELECT SUM(acw.base_fee) FROM arkabala_collection_weeks acw
                WHERE acw.id <= ? AND acw.is_active = 1
                AND NOT EXISTS (
                    SELECT 1 FROM arkabala_collections ac WHERE ac.peddler_id = ? AND ac.collection_week_id = acw.id AND ac.status = 'PAID'
                )
            ");
            $stmtUnpaid->execute([$currWeekId, $peddlerId]);
            $outstandingBalance = (float)($stmtUnpaid->fetchColumn() ?? 0);

            // Recent Arkabala collections
            $stmtRec = $pdo->prepare("
                SELECT ac.*, acw.week_number, acw.year
                FROM arkabala_collections ac
                JOIN arkabala_collection_weeks acw ON ac.collection_week_id = acw.id
                WHERE ac.peddler_id = ?
                ORDER BY ac.id DESC LIMIT 5
            ");
            $stmtRec->execute([$peddlerId]);
            $recentCollections = $stmtRec->fetchAll();
        }

        // Active Violations
        $activeViolations = [];
        if ($peddlerId > 0) {
            $stmtViol = $pdo->prepare("
                SELECT pv.*, vt.name AS violation_name
                FROM peddler_violations pv
                JOIN violation_types vt ON pv.violation_type_id = vt.id
                WHERE pv.peddler_id = ? AND pv.status = 'UNPAID'
                ORDER BY pv.id DESC
            ");
            $stmtViol->execute([$peddlerId]);
            $activeViolations = $stmtViol->fetchAll();
        }

        // Renewal & Permit Validity Evaluation
        $validUntil = $peddler['valid_until'] ?? null;
        $permitStatus = strtolower($peddler['permit_status'] ?? 'inactive');
        $today = date('Y-m-d');

        $isExpired = false;
        if (!empty($validUntil)) {
            $isExpired = (strtotime($validUntil) < strtotime($today)) || ($permitStatus === 'expired');
        } elseif (!empty($peddler['permit_number'])) {
            $isExpired = ($permitStatus === 'expired');
        }

        $hasPendingRenewal = false;
        if ($latestApp && strtolower($latestApp['application_type'] ?? '') === 'renewal' && !in_array($latestApp['status'], ['REJECTED', 'FINISHED'])) {
            $hasPendingRenewal = true;
        }

        $canRenew = $isExpired && !$hasPendingRenewal;
        $renewalMessage = '';
        if ($hasPendingRenewal) {
            $renewalMessage = 'Renewal application (' . ($latestApp['application_number'] ?? '') . ') is currently under review.';
        } elseif ($isExpired) {
            $renewalMessage = 'Your permit is expired. You are eligible to file for renewal.';
        } elseif (!empty($validUntil)) {
            $renewalMessage = 'Permit is currently ACTIVE and valid until ' . date('F d, Y', strtotime($validUntil)) . '. Renewal begins January 1.';
        } else {
            $renewalMessage = 'No issued permit found.';
        }

        Response::json([
            'peddler' => $peddler,
            'peddler_code' => $peddler['peddler_code'] ?? 'PENDING',
            'business_name' => $peddler['business_nature'] ?? ($latestApp['nature_of_business'] ?? 'N/A'),
            'application_status' => $latestApp['status'] ?? 'NONE',
            'latest_application' => $latestApp,
            'permit_number' => $peddler['permit_number'] ?? null,
            'permit_status' => $peddler['permit_status'] ?? 'INACTIVE',
            'valid_from' => $peddler['valid_from'] ?? null,
            'valid_until' => $peddler['valid_until'] ?? null,
            'is_expired' => $isExpired,
            'can_renew' => $canRenew,
            'has_pending_renewal' => $hasPendingRenewal,
            'renewal_message' => $renewalMessage,
            'qr_token' => $peddler['qr_token'] ?? null,
            'is_qr_active' => !empty($peddler['qr_active']),
            'arkabala_status' => $arkabalaStatus,
            'total_arkabala_paid' => $totalArkabalaPaid,
            'outstanding_arkabala_balance' => $outstandingBalance,
            'active_violations' => $activeViolations,
            'recent_transactions' => $recentCollections,
        ], 'Peddler dashboard metrics retrieved.');
    }
}
