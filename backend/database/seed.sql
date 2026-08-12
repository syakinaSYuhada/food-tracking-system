-- =========================================================
-- Kak Norie QDTS v2 Seed Data
-- PostgreSQL
-- =========================================================

-- IMPORTANT:
-- Run schema.sql first, then run this seed.sql.

-- =========================================================
-- USERS
-- 3 users only based on respondent/team size
-- =========================================================

INSERT INTO users (
	username,
	email,
	password_hash,
	full_name,
	role,
	account_status
)
VALUES
	(
		'nazhif',
		'nazhif@kaknorie.com',
		'$2b$10$JWNFqDBoojqvyltqMiGo/uYoNWb0raw8IMJ9pODP.fkeMj/9Ti5GS',
		'Nazhif',
		'manager',
		'active'
	),
	(
		'siti_aminah',
		'siti@kaknorie.com',
		'$2b$10$JWNFqDBoojqvyltqMiGo/uYoNWb0raw8IMJ9pODP.fkeMj/9Ti5GS',
		'Siti Aminah',
		'worker',
		'active'
	),
	(
		'hairul_nizam',
		'hairul@kaknorie.com',
		'$2b$10$JWNFqDBoojqvyltqMiGo/uYoNWb0raw8IMJ9pODP.fkeMj/9Ti5GS',
		'Hairul Nizam',
		'worker',
		'active'
	);

-- =========================================================
-- PRODUCTS
-- =========================================================

INSERT INTO products (
	product_name,
	product_code,
	category,
	packaging_type,
	size_weight,
	shelf_life_months,
	loss_rate_per_unit,
	storage_condition,
	description,
	product_status,
	created_by
)
VALUES
	(
		'Dendeng 60g',
		'DD-060',
		'Meat Product',
		'Retort Pouch',
		'60g',
		24,
		4.99,
		'Room Temperature',
		'Dried beef retort pouch — 60g snack size (Kak Norie retail SKU).',
		'active',
		1
	),
	(
		'Dendeng 180g',
		'DD-180',
		'Meat Product',
		'Retort Pouch',
		'180g',
		24,
		14.50,
		'Room Temperature',
		'Dried beef retort pouch — 180g pack (Kak Norie retail SKU).',
		'active',
		1
	),
	(
		'Daging Salai & Pes Masak Lemak',
		'DSML-350',
		'Meat Product',
		'Retort Pouch',
		'350g',
		24,
		19.50,
		'Room Temperature',
		'Smoked beef with coconut milk gravy retort meal — 350g (Kak Norie retail SKU).',
		'active',
		1
	),
	(
		'Chilli Oil',
		'CO-003',
		'Condiment',
		'Bottle',
		'200ml',
		18,
		8.00,
		'Room Temperature',
		'Aromatic chilli oil condiment for noodles, rice, and stir-fry dishes.',
		'development',
		1
	),
	(
		'Pes Nasi Goreng',
		'PNG-004',
		'Paste',
		'Retort Pouch',
		'250g',
		24,
		6.00,
		'Room Temperature',
		'Stir-fry paste base for traditional Malaysian fried rice.',
		'development',
		1
	),
	(
		'Pes Tumis Merah',
		'PTM-005',
		'Paste',
		'Retort Pouch',
		'250g',
		18,
		5.00,
		'Room Temperature',
		'Red stir-fry paste for quick tumis-style meal preparation.',
		'development',
		1
	);

-- Operational demo data (batches, defects, CAs) lives in seed_demo_timeline.sql

-- =========================================================
-- DEFECT TYPES
-- =========================================================

INSERT INTO defect_types (
	defect_type_name,
	defect_category,
	default_problem_level
)
VALUES
	('Wrong Expiry Date Printing', 'Labelling', 'Can Be Corrected'),
	('Untidy Label', 'Labelling', 'Can Be Corrected'),
	('Wrong Label Used', 'Labelling', 'Hold for Review'),
	('Label Not Set Properly', 'Labelling', 'Can Be Corrected'),
	('Wrong Batch Code on Label', 'Labelling', 'Hold for Review'),
	('Loose Sealing', 'Sealing', 'Hold for Review'),
	('Leaking Packaging', 'Packaging', 'Food Safety Risk'),
	('Bloated Packaging', 'Food Safety', 'Food Safety Risk'),
	('Smell Change', 'Quality', 'Food Safety Risk'),
	('Taste Change', 'Quality', 'Food Safety Risk'),
	('Product Spoiled', 'Food Safety', 'Food Safety Risk'),
	('Foreign Matter', 'Food Safety', 'Food Safety Risk'),
	('Weight Issue', 'Packing', 'Hold for Review'),
	('Colour / Texture Change', 'Quality', 'Hold for Review'),
	('Packaging Material Damaged', 'Packaging', 'Hold for Review'),
	('Retort Process Issue', 'Retort', 'Food Safety Risk'),
	('Ingredient Quality Issue', 'Ingredient', 'Hold for Review'),
	('Other', 'Other', 'Hold for Review');

-- =========================================================
-- DEFECT TYPE MAPPINGS BY DETECTED STAGE
-- =========================================================

-- Ingredient Preparation
INSERT INTO defect_type_mappings (detected_at_stage, defect_type_id)
SELECT 'Ingredient Preparation', id
FROM defect_types
WHERE defect_type_name IN (
	'Foreign Matter',
	'Smell Change',
	'Taste Change',
	'Ingredient Quality Issue',
	'Other'
);

-- Cooking
INSERT INTO defect_type_mappings (detected_at_stage, defect_type_id)
SELECT 'Cooking', id
FROM defect_types
WHERE defect_type_name IN (
	'Colour / Texture Change',
	'Smell Change',
	'Taste Change',
	'Product Spoiled',
	'Foreign Matter',
	'Other'
);

-- Packing / Filling
INSERT INTO defect_type_mappings (detected_at_stage, defect_type_id)
SELECT 'Packing / Filling', id
FROM defect_types
WHERE defect_type_name IN (
	'Foreign Matter',
	'Weight Issue',
	'Packaging Material Damaged',
	'Loose Sealing',
	'Other'
);

-- Sealing
INSERT INTO defect_type_mappings (detected_at_stage, defect_type_id)
SELECT 'Sealing', id
FROM defect_types
WHERE defect_type_name IN (
	'Loose Sealing',
	'Leaking Packaging',
	'Other'
);

-- Retort Process
INSERT INTO defect_type_mappings (detected_at_stage, defect_type_id)
SELECT 'Retort Process', id
FROM defect_types
WHERE defect_type_name IN (
	'Bloated Packaging',
	'Product Spoiled',
	'Colour / Texture Change',
	'Smell Change',
	'Taste Change',
	'Retort Process Issue',
	'Other'
);

-- Labelling / Expiry Printing
INSERT INTO defect_type_mappings (detected_at_stage, defect_type_id)
SELECT 'Labelling / Expiry Printing', id
FROM defect_types
WHERE defect_type_name IN (
	'Wrong Expiry Date Printing',
	'Untidy Label',
	'Wrong Label Used',
	'Label Not Set Properly',
	'Wrong Batch Code on Label',
	'Other'
);

-- Stock Storage
INSERT INTO defect_type_mappings (detected_at_stage, defect_type_id)
SELECT 'Stock Storage', id
FROM defect_types
WHERE defect_type_name IN (
	'Bloated Packaging',
	'Leaking Packaging',
	'Smell Change',
	'Taste Change',
	'Product Spoiled',
	'Packaging Material Damaged',
	'Other'
);

-- Before Delivery
INSERT INTO defect_type_mappings (detected_at_stage, defect_type_id)
SELECT 'Before Delivery', id
FROM defect_types
WHERE defect_type_name IN (
	'Wrong Expiry Date Printing',
	'Untidy Label',
	'Wrong Label Used',
	'Label Not Set Properly',
	'Wrong Batch Code on Label',
	'Leaking Packaging',
	'Bloated Packaging',
	'Smell Change',
	'Packaging Material Damaged',
	'Other'
);

-- After Customer Receives Product
INSERT INTO defect_type_mappings (detected_at_stage, defect_type_id)
SELECT 'After Customer Receives Product', id
FROM defect_types
WHERE defect_type_name IN (
	'Leaking Packaging',
	'Bloated Packaging',
	'Smell Change',
	'Taste Change',
	'Product Spoiled',
	'Wrong Expiry Date Printing',
	'Wrong Label Used',
	'Wrong Batch Code on Label',
	'Other'
);

-- =========================================================
-- ROOT CAUSES MASTER DATA
-- =========================================================

INSERT INTO root_causes (
	root_cause_source,
	root_cause_name
)
VALUES
	-- Machine / Tool
	('Machine / Tool', 'Sealing Pressure Issue'),
	('Machine / Tool', 'Sealing Temperature Issue'),
	('Machine / Tool', 'Weighing Tool Not Adjusted'),
	('Machine / Tool', 'Packing Tool Issue'),
	('Machine / Tool', 'Machine Setting Issue'),
	('Machine / Tool', 'Machine Not Checked Before Use'),
	('Machine / Tool', 'Cause Not Confirmed'),
	('Machine / Tool', 'Other'),

	-- Worker Process
	('Worker Process', 'Worker Forgot Checking Step'),
	('Worker Process', 'Incorrect Handling Procedure'),
	('Worker Process', 'Incomplete Checking Before Labelling'),
	('Worker Process', 'Wrong Setup Before Production'),
	('Worker Process', 'Product Not Checked Before Packing'),
	('Worker Process', 'Cause Not Confirmed'),
	('Worker Process', 'Other'),

	-- Label / Printing
	('Label / Printing', 'Expiry Mould Not Changed'),
	('Label / Printing', 'Wrong Expiry Date Setting'),
	('Label / Printing', 'Label Not Set Properly'),
	('Label / Printing', 'Wrong Label Used'),
	('Label / Printing', 'Test Print Not Done'),
	('Label / Printing', 'Cause Not Confirmed'),
	('Label / Printing', 'Other'),

	-- Packaging
	('Packaging', 'Packaging Material Damaged'),
	('Packaging', 'Pouch Material Defect'),
	('Packaging', 'Weak Sealing Area'),
	('Packaging', 'Bottle / Container Defect'),
	('Packaging', 'Packaging Not Checked Before Use'),
	('Packaging', 'Cause Not Confirmed'),
	('Packaging', 'Other'),

	-- Retort / Cooking Process
	('Retort / Cooking Process', 'Retort Temperature Too High'),
	('Retort / Cooking Process', 'Retort Temperature Too Low'),
	('Retort / Cooking Process', 'Retort Time Issue'),
	('Retort / Cooking Process', 'Cooking Temperature / Time Issue'),
	('Retort / Cooking Process', 'Product Not Processed Properly'),
	('Retort / Cooking Process', 'Cause Not Confirmed'),
	('Retort / Cooking Process', 'Other'),

	-- Storage
	('Storage', 'Storage Condition Issue'),
	('Storage', 'Unsuitable Temperature'),
	('Storage', 'Product Stored Too Long'),
	('Storage', 'Poor Stock Arrangement'),
	('Storage', 'Product Exposed During Storage'),
	('Storage', 'Cause Not Confirmed'),
	('Storage', 'Other'),

	-- Ingredient / Supplier
	('Ingredient / Supplier', 'Ingredient Quality Issue'),
	('Ingredient / Supplier', 'Supplier Material Defect'),
	('Ingredient / Supplier', 'Ingredient Not Fresh'),
	('Ingredient / Supplier', 'Wrong Ingredient Received'),
	('Ingredient / Supplier', 'Ingredient Contamination Suspected'),
	('Ingredient / Supplier', 'Cause Not Confirmed'),
	('Ingredient / Supplier', 'Other'),

	-- Other / Unknown
	('Other / Unknown', 'Cause Not Confirmed'),
	('Other / Unknown', 'Requires Further Investigation'),
	('Other / Unknown', 'Other');

-- =========================================================
-- QUICK CHECK QUERIES
-- =========================================================
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM products;
-- SELECT COUNT(*) FROM batches;
-- SELECT COUNT(*) FROM defects;
-- SELECT COUNT(*) FROM corrective_actions;
