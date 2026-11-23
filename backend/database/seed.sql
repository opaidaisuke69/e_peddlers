-- ==============================================================================
-- e-Peddlers: Seed Data for `e_peddlers`
-- ==============================================================================

USE `e_peddlers`;

-- Insert Roles with platform enforcement
INSERT INTO `roles` (`id`, `name`, `display_name`, `allowed_platforms`, `description`) VALUES
(1, 'admin', 'System Administrator', 'web', 'Full administrative control over applications, fees, users, and permit release'),
(2, 'treasury', 'Treasury Officer', 'web', 'Payment validation, revenue reconciliation, and government collections'),
(3, 'sanitary', 'Sanitary Inspector', 'mobile', 'Sanitary compliance inspection and health standard validation'),
(4, 'inspector', 'Field Inspector', 'mobile', 'Requirements validation, QR Arkabala field scanning, cash collection, and violation issuance'),
(5, 'peddler', 'Registered Peddler', 'both', 'Peddler portal access on both web and mobile platforms');

-- Insert Initial Staff Users
INSERT INTO `users` (`id`, `role_id`, `peddler_id`, `username`, `email`, `password_hash`, `first_name`, `middle_name`, `last_name`, `phone`, `status`) VALUES
(1, 1, NULL, 'admin', 'admin@lacarlota.gov.ph', '$2y$10$YSUwpeJ4acNh28xnM57UOuNJHOTNAWqOdgsQab9j1Qedqgl/r3pNq', 'Admin', 'C.', 'La Carlota', '09170000001', 'active'),
(2, 2, NULL, 'treasury', 'treasury@lacarlota.gov.ph', '$2y$10$/bkZT8.W9oqXGhXIgJffTuI7NuXLonJbHqij/GiX3bo/kd8iu2uF.', 'Teresa', 'M.', 'Tesoro', '09170000002', 'active'),
(3, 3, NULL, 'sanitary', 'sanitary@lacarlota.gov.ph', '$2y$10$Z2J4bIGlBLI53R.Dfuofee1oZf34I7arA99v3k6bSI4/lCjpQTg56', 'Doc', 'S.', 'Salud', '09170000003', 'active'),
(4, 4, NULL, 'inspector', 'inspector@lacarlota.gov.ph', '$2y$10$HbqTvZTB1F0ZKSmw8HHxYuA1tDj5cX6KixA7GE5rwaNK8YYjIG4Oi', 'Isko', 'B.', 'Bantay', '09170000004', 'active'),
(5, 5, 'PED-2026-0001', 'peddler_juan', 'peddler1@lacarlota.gov.ph', '$2y$10$tBaRhC5gISJ0QW.xWMjcd.t9NMDWeFv.nI/bymU3rE99YLyW96Xxa', 'Juan', 'Bautista', 'Dela Cruz', '09171234567', 'active'),
(6, 5, 'PED-2026-0002', 'peddler_maria', 'peddler2@lacarlota.gov.ph', '$2y$10$tBaRhC5gISJ0QW.xWMjcd.t9NMDWeFv.nI/bymU3rE99YLyW96Xxa', 'Maria', 'Clara', 'Santos', '09181234568', 'active');

-- Insert Initial Permit Fees (La Carlota City Schedule)
INSERT INTO `permit_fees` (`id`, `code`, `name`, `amount`, `fee_type`, `unit_name`, `description`, `is_active`) VALUES
(1, 'MAYORS_PERMIT', "Mayor's Permit", 110.00, 'fixed', NULL, 'Annual Mayor\'s Business Permit Fee', 1),
(2, 'SANITARY_PERMIT', 'Sanitary Permit', 55.00, 'fixed', NULL, 'City Health Sanitary Inspection Permit', 1),
(3, 'HEALTH_CERT', 'Health Certificate', 110.00, 'fixed', NULL, 'Peddler Occupational Health Certificate', 1),
(4, 'OCCUPATIONAL_TAX', 'Occupational Tax', 110.00, 'per_unit', 'Papag/Lag-it', 'Tax per Papag or Lag-it unit used', 1),
(5, 'GARBAGE_FEE', 'Garbage Fee', 55.00, 'fixed', NULL, 'Public waste management and sanitation fee', 1),
(6, 'BARANGAY_CLEARANCE', 'Barangay Clearance', 10.00, 'fixed', NULL, 'Barangay operational endorsement fee', 1),
(7, 'PEDDLERS_TAX', 'Peddlers Tax', 200.00, 'fixed', NULL, 'City annual peddler regulation tax', 1);

-- Insert Violation Types
INSERT INTO `violation_types` (`id`, `code`, `name`, `default_penalty`, `description`, `is_active`) VALUES
(1, 'LATE_REGISTRATION', 'Late Registration Penalty', 200.00, 'One month late registration penalty', 1),
(2, 'NO_PRICE_TAG', 'Absence of Price Tag', 150.00, 'Selling products without visible price tags under Consumer Act', 1),
(3, 'NO_SANITARY_PERMIT', 'Sanitary Non-Compliance', 300.00, 'Operating without valid sanitary sticker/health compliance', 1),
(4, 'OBSTRUCTION_WAY', 'Obstruction of Public Pathway', 200.00, 'Setting up papag/cart outside designated peddling zone', 1),
(5, 'UNHYGIENIC_FOOD', 'Unhygienic Food Handling', 250.00, 'Failure to maintain proper hair net, clean apron, or food cover', 1);

-- Insert Sample Peddler Records
INSERT INTO `peddlers` (`id`, `peddler_code`, `user_id`, `first_name`, `middle_name`, `last_name`, `gender`, `civil_status`, `ctc_number`, `phone`, `email`, `business_nature`, `business_type`, `num_employees`, `num_papag`, `num_lag_it`, `status`, `qr_code_token`, `is_qr_active`) VALUES
(1, 'PED-2026-0001', 5, 'Juan', 'Bautista', 'Dela Cruz', 'Male', 'Married', 'CTC-2026-8812', '09171234567', 'peddler1@lacarlota.gov.ph', 'Native Delicacies & Fresh Fruit Vending', 'Peddlers', 1, 1, 1, 'active', 'QR-PED-2026-0001-TOKEN-ABC123XYZ', 1),
(2, 'PED-2026-0002', 6, 'Maria', 'Clara', 'Santos', 'Female', 'Single', 'CTC-2026-4491', '09181234568', 'peddler2@lacarlota.gov.ph', 'Street Snacks and Refreshments', 'Peddlers', 0, 2, 1, 'active', 'QR-PED-2026-0002-TOKEN-DEF456UVW', 1);

-- Insert Peddler Addresses
INSERT INTO `peddler_addresses` (`id`, `peddler_id`, `residential_address`, `residential_barangay`, `residential_city`, `business_address`, `business_barangay`, `business_city`) VALUES
(1, 1, 'Zone 2, Hda. Esperanza', 'Barangay II', 'La Carlota City', 'Public Plaza Perimeter, Fronting Market', 'Barangay I', 'La Carlota City'),
(2, 2, 'Purok Mangga, Sitio Balabag', 'Barangay III', 'La Carlota City', 'Commercial Center Walkway', 'Barangay II', 'La Carlota City');

-- Insert Emergency Contacts
INSERT INTO `emergency_contacts` (`id`, `peddler_id`, `contact_person`, `contact_phone`, `relationship`) VALUES
(1, 1, 'Elena Dela Cruz', '09179998881', 'Spouse'),
(2, 2, 'Pedro Santos', '09187776662', 'Brother');

-- Insert Peddler QR Codes
INSERT INTO `peddler_qr_codes` (`id`, `peddler_id`, `token`, `is_active`) VALUES
(1, 1, 'QR-PED-2026-0001-TOKEN-ABC123XYZ', 1),
(2, 2, 'QR-PED-2026-0002-TOKEN-DEF456UVW', 1);

-- Insert Sample Applications in various workflow states for instant testing
INSERT INTO `permit_applications` (
  `id`, `application_number`, `peddler_id`, `application_type`, `gender`, `civil_status`, `ctc_number`, 
  `date_of_application`, `last_name`, `first_name`, `middle_name`, `residential_address`, `residential_barangay`, 
  `residential_city`, `email`, `phone`, `nature_of_business`, `business_type`, `num_employees`, 
  `business_address`, `business_barangay`, `business_city`, `num_papag`, `num_lag_it`, 
  `emergency_contact_person`, `emergency_contact_phone`, `agreed_to_terms`, `status`, `current_stage`
) VALUES
(1, 'APP-2026-0001', 1, 'New', 'Male', 'Married', 'CTC-2026-8812', '2026-11-01', 'Dela Cruz', 'Juan', 'Bautista', 'Zone 2, Hda. Esperanza', 'Barangay II', 'La Carlota City', 'peddler1@lacarlota.gov.ph', '09171234567', 'Native Delicacies & Fresh Fruit Vending', 'Peddlers', 1, 'Public Plaza Perimeter', 'Barangay I', 'La Carlota City', 1, 1, 'Elena Dela Cruz', '09179998881', 1, 'FINISHED', 6),
(2, 'APP-2026-0002', 2, 'New', 'Female', 'Single', 'CTC-2026-4491', '2026-11-05', 'Santos', 'Maria', 'Clara', 'Purok Mangga, Sitio Balabag', 'Barangay III', 'La Carlota City', 'peddler2@lacarlota.gov.ph', '09181234568', 'Street Snacks and Refreshments', 'Peddlers', 0, 'Commercial Center Walkway', 'Barangay II', 'La Carlota City', 2, 1, 'Pedro Santos', '09187776662', 1, 'READY_FOR_PERMIT_RELEASE', 5),
(3, 'APP-2026-0003', NULL, 'New', 'Male', 'Single', 'CTC-2026-1123', '2026-11-20', 'Reyes', 'Arnel', 'G.', 'Sitio Cambugao', 'Barangay Ara-al', 'La Carlota City', 'arnel.reyes@example.com', '09201112233', 'Grilled Street Food (Inasal & Isaw)', 'Peddlers', 0, 'Guanzon Street Corner', 'Barangay I', 'La Carlota City', 1, 0, 'Luz Reyes', '09203334455', 1, 'PENDING_ADMIN_APPROVAL', 1),
(4, 'APP-2026-0004', NULL, 'New', 'Female', 'Married', 'CTC-2026-5541', '2026-11-18', 'Tan', 'Jocelyn', 'V.', 'Purok San Jose', 'Barangay Balabag', 'La Carlota City', 'jocelyn.tan@example.com', '09192223344', 'Roasted Peanuts and Corn on the Cob', 'Peddlers', 0, 'La Carlota City Hall Grounds', 'Barangay II', 'La Carlota City', 1, 1, 'Roberto Tan', '09194445566', 1, 'PENDING_INSPECTOR_APPROVAL', 2),
(5, 'APP-2026-0005', NULL, 'New', 'Male', 'Married', 'CTC-2026-7782', '2026-11-15', 'Gonzales', 'Ramon', 'S.', 'Hda. Salamanca', 'Barangay San Miguel', 'La Carlota City', 'ramon.gonzales@example.com', '09173334455', 'Fresh Fish & Seafood Bucket Peddling', 'Peddlers', 1, 'Agripino Elementary School Zone', 'Barangay III', 'La Carlota City', 2, 0, 'Carmen Gonzales', '09175556677', 1, 'PENDING_SANITARY_APPROVAL', 3),
(6, 'APP-2026-0006', NULL, 'New', 'Female', 'Single', 'CTC-2026-9921', '2026-11-12', 'Flores', 'Bernadette', 'A.', 'Purok Ilang-Ilang', 'Barangay Cubay', 'La Carlota City', 'bernadette.flores@example.com', '09184445566', 'Fresh Fruit Shakes & Refreshments', 'Peddlers', 0, 'Public Market North Terminal', 'Barangay I', 'La Carlota City', 1, 1, 'Ana Flores', '09186667788', 1, 'PENDING_TREASURY_PAYMENT', 4);

-- Application Signatures for sample applications
INSERT INTO `application_signatures` (`application_id`, `signature_data`) VALUES
(1, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=')
ON DUPLICATE KEY UPDATE `signature_data` = VALUES(`signature_data`);

-- Insert Sample Released Permit for Juan Dela Cruz
INSERT INTO `permits` (`id`, `permit_number`, `application_id`, `peddler_id`, `business_name`, `business_location`, `valid_from`, `valid_until`, `qr_code_token`, `status`, `released_by_user_id`) VALUES
(1, 'PERMIT-2026-0001', 1, 1, 'Native Delicacies & Fresh Fruit Vending', 'Public Plaza Perimeter, Fronting Market, Barangay I, La Carlota City', '2026-11-01', '2027-11-01', 'QR-PED-2026-0001-TOKEN-ABC123XYZ', 'active', 1);

-- Insert Permit Validity Record
INSERT INTO `permit_validity` (`permit_id`, `start_date`, `end_date`, `extended_months`) VALUES
(1, '2026-11-01', '2027-11-01', 0);

-- Insert Fee Snapshot for Juan Dela Cruz (APP-2026-0001)
-- 1 Papag + 1 Lag-it = 2 units. Base: 540 + (110*2) = 760 PHP
INSERT INTO `fee_snapshots` (`application_id`, `fee_breakdown`, `subtotal`, `penalty_amount`, `total_amount`) VALUES
(1, JSON_ARRAY(
  JSON_OBJECT('code', 'MAYORS_PERMIT', 'name', "Mayor's Permit", 'amount', 110.00),
  JSON_OBJECT('code', 'SANITARY_PERMIT', 'name', 'Sanitary Permit', 'amount', 55.00),
  JSON_OBJECT('code', 'HEALTH_CERT', 'name', 'Health Certificate', 'amount', 110.00),
  JSON_OBJECT('code', 'OCCUPATIONAL_TAX', 'name', 'Occupational Tax (2 units @ ₱110)', 'amount', 220.00),
  JSON_OBJECT('code', 'GARBAGE_FEE', 'name', 'Garbage Fee', 'amount', 55.00),
  JSON_OBJECT('code', 'BARANGAY_CLEARANCE', 'name', 'Barangay Clearance', 'amount', 10.00),
  JSON_OBJECT('code', 'PEDDLERS_TAX', 'name', 'Peddlers Tax', 'amount', 200.00)
), 760.00, 0.00, 760.00),
(2, JSON_ARRAY(
  JSON_OBJECT('code', 'MAYORS_PERMIT', 'name', "Mayor's Permit", 'amount', 110.00),
  JSON_OBJECT('code', 'SANITARY_PERMIT', 'name', 'Sanitary Permit', 'amount', 55.00),
  JSON_OBJECT('code', 'HEALTH_CERT', 'name', 'Health Certificate', 'amount', 110.00),
  JSON_OBJECT('code', 'OCCUPATIONAL_TAX', 'name', 'Occupational Tax (3 units @ ₱110)', 'amount', 330.00),
  JSON_OBJECT('code', 'GARBAGE_FEE', 'name', 'Garbage Fee', 'amount', 55.00),
  JSON_OBJECT('code', 'BARANGAY_CLEARANCE', 'name', 'Barangay Clearance', 'amount', 10.00),
  JSON_OBJECT('code', 'PEDDLERS_TAX', 'name', 'Peddlers Tax', 'amount', 200.00)
), 870.00, 0.00, 870.00);

-- Insert Permit Payments
INSERT INTO `permit_payments` (`id`, `application_id`, `payment_method`, `amount_due`, `amount_paid`, `status`, `or_number`, `treasury_user_id`, `verified_at`) VALUES
(1, 1, 'CASH', 760.00, 760.00, 'VERIFIED', 'OR-LC-2026-0001', 2, '2026-11-02 10:15:00'),
(2, 2, 'PAYMONGO_QRPH', 870.00, 870.00, 'VERIFIED', 'OR-LC-2026-0002', 2, '2026-11-06 14:30:00');

-- Insert Official Receipts
INSERT INTO `official_receipts` (`or_number`, `application_id`, `payment_id`, `peddler_id`, `payor_name`, `amount`, `payment_type`, `issued_by_user_id`, `issued_date`) VALUES
('OR-LC-2026-0001', 1, 1, 1, 'Juan Dela Cruz', 760.00, 'PERMIT_FEE', 2, '2026-11-02'),
('OR-LC-2026-0002', 2, 2, 2, 'Maria Clara Santos', 870.00, 'PERMIT_FEE', 2, '2026-11-06');

-- Insert Arkabala Collection Weeks for 2026
INSERT INTO `arkabala_collection_weeks` (`id`, `year`, `week_number`, `start_date`, `end_date`, `base_fee`, `is_active`) VALUES
(1, 2026, 45, '2026-11-02', '2026-11-08', 50.00, 1),
(2, 2026, 46, '2026-11-09', '2026-11-15', 50.00, 1),
(3, 2026, 47, '2026-11-16', '2026-11-22', 50.00, 1),
(4, 2026, 48, '2026-11-23', '2026-11-29', 50.00, 1);

-- Insert Sample Arkabala Collections for Juan Dela Cruz
INSERT INTO `arkabala_collections` (`id`, `transaction_code`, `peddler_id`, `collection_week_id`, `amount`, `collection_date`, `payment_method`, `collected_by_user_id`, `status`, `receipt_number`, `reconciled_by_treasury`) VALUES
(1, 'ARK-2026-W45-0001', 1, 1, 50.00, '2026-11-03', 'CASH', 4, 'PAID', 'ARK-REC-001', 1),
(2, 'ARK-2026-W46-0001', 1, 2, 50.00, '2026-11-10', 'CASH', 4, 'PAID', 'ARK-REC-002', 1),
(3, 'ARK-2026-W47-0001', 1, 3, 50.00, '2026-11-17', 'CASH', 4, 'PAID', 'ARK-REC-003', 0);

-- Insert Sample Violations
INSERT INTO `peddler_violations` (`id`, `violation_number`, `peddler_id`, `violation_type_id`, `description`, `violation_date`, `penalty_amount`, `status`, `issued_by_user_id`) VALUES
(1, 'VIOL-2026-0001', 1, 2, 'Prices for mangoes and bananas were not visibly posted on the peddling cart', '2026-11-12', 150.00, 'PAID', 4),
(2, 'VIOL-2026-0002', 2, 4, 'Lag-it placed extending past the designated curb line', '2026-11-19', 200.00, 'UNPAID', 4);

-- Insert System Settings
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('city_name', 'La Carlota City', 'Name of the Local Government Unit'),
('lgu_office', 'Business Permits & Licensing Office', 'Permit issuing office'),
('city_province', 'Negros Occidental, Philippines', 'City province and country'),
('arkabala_standard_fee', '50.00', 'Standard weekly Arkabala fee in Philippine Pesos'),
('late_registration_penalty', '200.00', 'Penalty for registration past due by one month'),
('paymongo_environment', 'test', 'PayMongo operating environment (test/live)'),
('smtp_notifications_enabled', '1', 'Toggle PHPMailer automated email delivery'),
('system_version', '1.0.0', 'e-Peddlers System Version');

-- Insert Initial Notifications
INSERT INTO `notifications` (`user_id`, `target_role`, `title`, `message`, `type`, `reference_id`, `is_read`) VALUES
(1, 'admin', 'New Application Submitted', 'Arnel Reyes submitted application APP-2026-0003 for review.', 'info', 'APP-2026-0003', 0),
(4, 'inspector', 'Application Ready for Inspection', 'Jocelyn Tan (APP-2026-0004) is pending field requirements validation.', 'info', 'APP-2026-0004', 0),
(3, 'sanitary', 'Sanitary Inspection Required', 'Ramon Gonzales (APP-2026-0005) forwarded for sanitary compliance review.', 'warning', 'APP-2026-0005', 0),
(2, 'treasury', 'Permit Payment Pending', 'Bernadette Flores (APP-2026-0006) is ready for permit payment.', 'info', 'APP-2026-0006', 0),
(1, 'admin', 'Ready for Permit Release', 'Maria Santos (APP-2026-0002) payment verified. Ready for permit release.', 'success', 'APP-2026-0002', 0);
