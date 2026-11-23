-- ==============================================================================
-- e-Peddlers: La Carlota City Peddler Business Permit Application & Management System
-- Database Schema for `e_peddlers`
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `e_peddlers` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `e_peddlers`;

SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables to allow clean migrations
DROP TABLE IF EXISTS `system_announcements`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `email_logs`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `violation_payments`;
DROP TABLE IF EXISTS `peddler_violations`;
DROP TABLE IF EXISTS `violation_types`;
DROP TABLE IF EXISTS `arkabala_payments`;
DROP TABLE IF EXISTS `arkabala_collections`;
DROP TABLE IF EXISTS `arkabala_collection_weeks`;
DROP TABLE IF EXISTS `official_receipts`;
DROP TABLE IF EXISTS `payment_webhooks`;
DROP TABLE IF EXISTS `payment_transactions`;
DROP TABLE IF EXISTS `permit_payments`;
DROP TABLE IF EXISTS `fee_snapshots`;
DROP TABLE IF EXISTS `permit_fees`;
DROP TABLE IF EXISTS `permit_documents`;
DROP TABLE IF EXISTS `permit_validity`;
DROP TABLE IF EXISTS `permits`;
DROP TABLE IF EXISTS `application_renewals`;
DROP TABLE IF EXISTS `application_history`;
DROP TABLE IF EXISTS `application_approvals`;
DROP TABLE IF EXISTS `application_signatures`;
DROP TABLE IF EXISTS `application_documents`;
DROP TABLE IF EXISTS `permit_applications`;
DROP TABLE IF EXISTS `peddler_qr_codes`;
DROP TABLE IF EXISTS `emergency_contacts`;
DROP TABLE IF EXISTS `peddler_addresses`;
DROP TABLE IF EXISTS `peddlers`;
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `otp_verifications`;
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Roles table
CREATE TABLE `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `display_name` VARCHAR(100) NOT NULL,
  `allowed_platforms` ENUM('web', 'mobile', 'both') NOT NULL DEFAULT 'both',
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users table (Admin, Treasury, Sanitary, Inspector, Peddlers)
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT NOT NULL,
  `peddler_id` VARCHAR(50) NULL UNIQUE, -- For Peddlers, references peddlers.peddler_code
  `username` VARCHAR(100) NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NULL, -- Staff use password; Peddler uses OTP authentication
  `first_name` VARCHAR(100) NOT NULL,
  `middle_name` VARCHAR(100) NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `avatar_url` VARCHAR(255) NULL,
  `status` ENUM('active', 'inactive', 'suspended', 'pending') NOT NULL DEFAULT 'active',
  `last_login_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. User Sessions
CREATE TABLE `user_sessions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `platform` ENUM('web', 'mobile') NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. OTP Verifications (for passwordless peddler login & operations)
CREATE TABLE `otp_verifications` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `identifier` VARCHAR(150) NOT NULL, -- Email, phone, or peddler_id
  `otp_code` VARCHAR(10) NOT NULL,
  `purpose` VARCHAR(50) NOT NULL DEFAULT 'login',
  `expires_at` DATETIME NOT NULL,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `attempts` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_otp_identifier` (`identifier`, `is_used`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Activity Logs (Audit Trail)
CREATE TABLE `activity_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `role_name` VARCHAR(50) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NULL,
  `entity_id` VARCHAR(100) NULL,
  `details` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `platform` ENUM('web', 'mobile', 'system') NOT NULL DEFAULT 'web',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_logs_action` (`action`),
  INDEX `idx_logs_user` (`user_id`),
  INDEX `idx_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Peddlers Master Table
CREATE TABLE `peddlers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `peddler_code` VARCHAR(50) NOT NULL UNIQUE, -- E.g. PED-2026-0001
  `user_id` INT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `middle_name` VARCHAR(100) NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `gender` ENUM('Male', 'Female') NOT NULL,
  `civil_status` VARCHAR(50) NOT NULL DEFAULT 'Single',
  `ctc_number` VARCHAR(50) NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `business_nature` VARCHAR(150) NOT NULL,
  `business_type` VARCHAR(100) NOT NULL DEFAULT 'Peddlers',
  `num_employees` INT NOT NULL DEFAULT 0,
  `num_papag` INT NOT NULL DEFAULT 0,
  `num_lag_it` INT NOT NULL DEFAULT 0,
  `status` ENUM('active', 'inactive', 'suspended', 'pending_approval') NOT NULL DEFAULT 'pending_approval',
  `qr_code_token` VARCHAR(100) NULL UNIQUE,
  `qr_code_path` VARCHAR(255) NULL,
  `is_qr_active` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_peddler_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Peddler Addresses
CREATE TABLE `peddler_addresses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `peddler_id` INT NOT NULL,
  `residential_address` TEXT NOT NULL,
  `residential_barangay` VARCHAR(100) NOT NULL,
  `residential_city` VARCHAR(100) NOT NULL DEFAULT 'La Carlota City',
  `business_address` TEXT NOT NULL,
  `business_barangay` VARCHAR(100) NOT NULL,
  `business_city` VARCHAR(100) NOT NULL DEFAULT 'La Carlota City',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`peddler_id`) REFERENCES `peddlers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Emergency Contacts
CREATE TABLE `emergency_contacts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `peddler_id` INT NOT NULL,
  `contact_person` VARCHAR(150) NOT NULL,
  `contact_phone` VARCHAR(30) NOT NULL,
  `relationship` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`peddler_id`) REFERENCES `peddlers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Peddler QR Codes
CREATE TABLE `peddler_qr_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `peddler_id` INT NOT NULL,
  `token` VARCHAR(100) NOT NULL UNIQUE,
  `image_path` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `generated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`peddler_id`) REFERENCES `peddlers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Permit Applications
CREATE TABLE `permit_applications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `application_number` VARCHAR(50) NOT NULL UNIQUE, -- APP-2026-0001
  `peddler_id` INT NULL, -- NULL until Admin approves for new applicant, or pre-existing for renewal
  `application_type` ENUM('New', 'Renewal') NOT NULL DEFAULT 'New',
  `gender` ENUM('Male', 'Female') NOT NULL,
  `civil_status` VARCHAR(50) NOT NULL,
  `ctc_number` VARCHAR(50) NULL,
  `date_of_application` DATE NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `middle_name` VARCHAR(100) NULL,
  `residential_address` TEXT NOT NULL,
  `residential_barangay` VARCHAR(100) NOT NULL,
  `residential_city` VARCHAR(100) NOT NULL DEFAULT 'La Carlota City',
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `nature_of_business` VARCHAR(150) NOT NULL,
  `business_type` VARCHAR(100) NOT NULL DEFAULT 'Peddlers',
  `num_employees` INT NOT NULL DEFAULT 0,
  `business_address` TEXT NOT NULL,
  `business_barangay` VARCHAR(100) NOT NULL,
  `business_city` VARCHAR(100) NOT NULL DEFAULT 'La Carlota City',
  `num_papag` INT NOT NULL DEFAULT 0,
  `num_lag_it` INT NOT NULL DEFAULT 0,
  `emergency_contact_person` VARCHAR(150) NOT NULL,
  `emergency_contact_phone` VARCHAR(30) NOT NULL,
  `agreed_to_terms` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM(
    'PENDING_ADMIN_APPROVAL',
    'ADMIN_REJECTED',
    'PENDING_INSPECTOR_APPROVAL',
    'INSPECTOR_REJECTED',
    'PENDING_SANITARY_APPROVAL',
    'SANITARY_REJECTED',
    'PENDING_TREASURY_PAYMENT',
    'PAYMENT_REJECTED',
    'READY_FOR_PERMIT_RELEASE',
    'FINISHED'
  ) NOT NULL DEFAULT 'PENDING_ADMIN_APPROVAL',
  `rejection_reason` TEXT NULL,
  `rejected_by_role` VARCHAR(50) NULL,
  `current_stage` INT NOT NULL DEFAULT 1, -- 1: Admin, 2: Inspector, 3: Sanitary, 4: Treasury, 5: Release, 6: Completed
  `is_late_renewal` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`peddler_id`) REFERENCES `peddlers`(`id`) ON DELETE SET NULL,
  INDEX `idx_app_status` (`status`),
  INDEX `idx_app_num` (`application_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Application Documents
CREATE TABLE `application_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `application_id` INT NOT NULL,
  `document_type` ENUM('price_tag', 'sample_products', 'barangay_clearance', 'government_id', 'sanitary_doc', 'other') NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) NOT NULL,
  `file_size` INT NOT NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`application_id`) REFERENCES `permit_applications`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Application Signatures
CREATE TABLE `application_signatures` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `application_id` INT NOT NULL,
  `signature_data` LONGTEXT NOT NULL, -- base64 drawn signature
  `signed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`application_id`) REFERENCES `permit_applications`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Application Approvals & Decisions Log
CREATE TABLE `application_approvals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `application_id` INT NOT NULL,
  `stage` ENUM('ADMIN', 'INSPECTOR', 'SANITARY', 'TREASURY', 'PERMIT_RELEASE') NOT NULL,
  `user_id` INT NULL,
  `decision` ENUM('APPROVED', 'REJECTED') NOT NULL,
  `remarks` TEXT NULL,
  `action_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`application_id`) REFERENCES `permit_applications`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Application History Timeline
CREATE TABLE `application_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `application_id` INT NOT NULL,
  `stage_name` VARCHAR(100) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `actor_name` VARCHAR(150) NOT NULL,
  `actor_role` VARCHAR(50) NOT NULL,
  `remarks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`application_id`) REFERENCES `permit_applications`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Application Renewals
CREATE TABLE `application_renewals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `application_id` INT NOT NULL,
  `previous_permit_id` INT NULL,
  `previous_permit_number` VARCHAR(50) NULL,
  `late_fee_applied` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`application_id`) REFERENCES `permit_applications`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Permit Fees Configuration
CREATE TABLE `permit_fees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `fee_type` ENUM('fixed', 'per_unit') NOT NULL DEFAULT 'fixed',
  `unit_name` VARCHAR(50) NULL, -- E.g. 'Papag/Lag-it'
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Fee Snapshots (Immutable snapshot when application is submitted/billed)
CREATE TABLE `fee_snapshots` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `application_id` INT NOT NULL,
  `fee_breakdown` JSON NOT NULL, -- Detailed array of fee items and computations
  `subtotal` DECIMAL(10,2) NOT NULL,
  `penalty_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`application_id`) REFERENCES `permit_applications`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. Permit Payments
CREATE TABLE `permit_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `application_id` INT NOT NULL,
  `payment_method` ENUM('CASH', 'PAYMONGO_QRPH') NOT NULL,
  `amount_due` DECIMAL(10,2) NOT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `or_number` VARCHAR(50) NULL, -- Official Receipt Number
  `treasury_user_id` INT NULL,
  `remarks` TEXT NULL,
  `verified_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`application_id`) REFERENCES `permit_applications`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`treasury_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Payment Transactions (PayMongo & Cash)
CREATE TABLE `payment_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_id` INT NULL,
  `transaction_number` VARCHAR(100) NOT NULL UNIQUE,
  `gateway` VARCHAR(50) NOT NULL DEFAULT 'PAYMONGO',
  `paymongo_payment_intent_id` VARCHAR(100) NULL,
  `paymongo_source_id` VARCHAR(100) NULL,
  `paymongo_qr_url` TEXT NULL,
  `raw_status` VARCHAR(50) NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'PHP',
  `payload` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`payment_id`) REFERENCES `permit_payments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. Payment Webhooks
CREATE TABLE `payment_webhooks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` VARCHAR(100) NOT NULL UNIQUE,
  `event_type` VARCHAR(100) NOT NULL,
  `payload` JSON NOT NULL,
  `is_processed` TINYINT(1) NOT NULL DEFAULT 0,
  `processed_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. Official Receipts
CREATE TABLE `official_receipts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `or_number` VARCHAR(50) NOT NULL UNIQUE,
  `application_id` INT NOT NULL,
  `payment_id` INT NOT NULL,
  `peddler_id` INT NULL,
  `payor_name` VARCHAR(150) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_type` VARCHAR(50) NOT NULL DEFAULT 'PERMIT_FEE',
  `issued_by_user_id` INT NOT NULL,
  `issued_date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`application_id`) REFERENCES `permit_applications`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`payment_id`) REFERENCES `permit_payments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`issued_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. Permits Released Master Table
CREATE TABLE `permits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `permit_number` VARCHAR(50) NOT NULL UNIQUE, -- E.g. PERMIT-2026-0001
  `application_id` INT NOT NULL,
  `peddler_id` INT NOT NULL,
  `business_name` VARCHAR(150) NOT NULL,
  `business_location` TEXT NOT NULL,
  `valid_from` DATE NOT NULL,
  `valid_until` DATE NOT NULL,
  `qr_code_token` VARCHAR(100) NOT NULL,
  `status` ENUM('active', 'expired', 'revoked', 'suspended') NOT NULL DEFAULT 'active',
  `released_by_user_id` INT NOT NULL,
  `released_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`application_id`) REFERENCES `permit_applications`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`peddler_id`) REFERENCES `peddlers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`released_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 23. Permit Validity
CREATE TABLE `permit_validity` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `permit_id` INT NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `extended_months` INT NOT NULL DEFAULT 0,
  `extension_reason` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`permit_id`) REFERENCES `permits`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 24. Permit Documents (PDFs generated)
CREATE TABLE `permit_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `permit_id` INT NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `generated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`permit_id`) REFERENCES `permits`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 25. Arkabala Collection Weeks
CREATE TABLE `arkabala_collection_weeks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `year` INT NOT NULL,
  `week_number` INT NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `base_fee` DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_year_week` (`year`, `week_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 26. Arkabala Collections
CREATE TABLE `arkabala_collections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `transaction_code` VARCHAR(50) NOT NULL UNIQUE, -- ARK-2026-WXX-XXXX
  `peddler_id` INT NOT NULL,
  `collection_week_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `collection_date` DATE NOT NULL,
  `payment_method` ENUM('CASH', 'ONLINE') NOT NULL DEFAULT 'CASH',
  `collected_by_user_id` INT NOT NULL, -- Inspector
  `status` ENUM('PAID', 'UNPAID', 'OVERDUE', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'PAID',
  `receipt_number` VARCHAR(50) NOT NULL UNIQUE,
  `reconciled_by_treasury` TINYINT(1) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`peddler_id`) REFERENCES `peddlers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`collection_week_id`) REFERENCES `arkabala_collection_weeks`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`collected_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  UNIQUE KEY `uk_peddler_week` (`peddler_id`, `collection_week_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 27. Arkabala Payments Ledger
CREATE TABLE `arkabala_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `collection_id` INT NOT NULL,
  `payment_reference` VARCHAR(100) NULL,
  `paymongo_id` VARCHAR(100) NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `paid_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`collection_id`) REFERENCES `arkabala_collections`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 28. Violation Types
CREATE TABLE `violation_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `default_penalty` DECIMAL(10,2) NOT NULL,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 29. Peddler Violations
CREATE TABLE `peddler_violations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `violation_number` VARCHAR(50) NOT NULL UNIQUE,
  `peddler_id` INT NOT NULL,
  `violation_type_id` INT NOT NULL,
  `description` TEXT NOT NULL,
  `evidence_photo_path` VARCHAR(255) NULL,
  `violation_date` DATE NOT NULL,
  `penalty_amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('UNPAID', 'PAID', 'WAIVED', 'APPEALED') NOT NULL DEFAULT 'UNPAID',
  `issued_by_user_id` INT NOT NULL, -- Inspector
  `resolved_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`peddler_id`) REFERENCES `peddlers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`violation_type_id`) REFERENCES `violation_types`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`issued_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 30. Violation Payments
CREATE TABLE `violation_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `violation_id` INT NOT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('CASH', 'ONLINE') NOT NULL DEFAULT 'CASH',
  `receipt_number` VARCHAR(50) NOT NULL,
  `paid_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`violation_id`) REFERENCES `peddler_violations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 31. Notifications
CREATE TABLE `notifications` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL, -- Target user, or NULL for role broadcast
  `target_role` VARCHAR(50) NULL, -- 'admin', 'treasury', 'sanitary', 'inspector', 'peddler'
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  `reference_id` VARCHAR(100) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_notif_user` (`user_id`, `is_read`),
  INDEX `idx_notif_role` (`target_role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 32. Email Logs
CREATE TABLE `email_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `recipient_email` VARCHAR(150) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body_html` LONGTEXT NOT NULL,
  `status` ENUM('SENT', 'FAILED', 'QUEUED') NOT NULL DEFAULT 'SENT',
  `error_message` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 33. System Settings
CREATE TABLE `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 34. System Announcements
CREATE TABLE `system_announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `target_role` VARCHAR(50) NOT NULL DEFAULT 'ALL',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
