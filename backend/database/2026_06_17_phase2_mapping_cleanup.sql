-- Phase 2: Retort Niaga mapping cleanup (apply to existing databases without full reseed)
-- Usage: psql $DATABASE_URL -f backend/database/2026_06_17_phase2_mapping_cleanup.sql
-- Or run via node after connecting (see scripts/apply-phase2-mapping-migration.js)

-- 1. Rename user-facing stage labels
UPDATE defect_type_mappings SET detected_at_stage = 'Packing / Filling' WHERE detected_at_stage = 'Packing';
UPDATE defect_type_mappings SET detected_at_stage = 'Labelling / Expiry Printing' WHERE detected_at_stage = 'Labelling';
UPDATE defect_type_mappings SET detected_at_stage = 'Retort Process' WHERE detected_at_stage = 'Retort';

UPDATE defects SET detected_at_stage = 'Packing / Filling' WHERE detected_at_stage = 'Packing';
UPDATE defects SET detected_at_stage = 'Labelling / Expiry Printing' WHERE detected_at_stage = 'Labelling';
UPDATE defects SET detected_at_stage = 'Retort Process' WHERE detected_at_stage = 'Retort';

-- 2. Remove Bloated Packaging from Sealing stage
DELETE FROM defect_type_mappings dtm
USING defect_types dt
WHERE dtm.defect_type_id = dt.id
  AND dtm.detected_at_stage = 'Sealing'
  AND dt.defect_type_name = 'Bloated Packaging';

-- 3. New defect type (no schema change)
INSERT INTO defect_types (defect_type_name, defect_category, default_problem_level)
VALUES ('Wrong Batch Code on Label', 'Labelling', 'Hold for Review')
ON CONFLICT (defect_type_name) DO UPDATE SET
  defect_category = EXCLUDED.defect_category,
  default_problem_level = EXCLUDED.default_problem_level;

-- 4. Stage mappings (idempotent)
INSERT INTO defect_type_mappings (detected_at_stage, defect_type_id)
SELECT stage, dt.id
FROM (
  VALUES
    ('Ingredient Preparation', 'Ingredient Quality Issue'),
    ('Cooking', 'Colour / Texture Change'),
    ('Retort Process', 'Colour / Texture Change'),
    ('Labelling / Expiry Printing', 'Wrong Batch Code on Label'),
    ('Before Delivery', 'Wrong Label Used'),
    ('Before Delivery', 'Label Not Set Properly'),
    ('Before Delivery', 'Wrong Batch Code on Label'),
    ('After Customer Receives Product', 'Wrong Label Used'),
    ('After Customer Receives Product', 'Wrong Batch Code on Label')
) AS m(stage, defect_type)
JOIN defect_types dt ON dt.defect_type_name = m.defect_type
ON CONFLICT (detected_at_stage, defect_type_id) DO NOTHING;

-- 5. Workflow rules for dedicated mappings (no Other fallback)
INSERT INTO defect_workflow_rules (defect_type, default_problem_level, recommended_priority) VALUES
('Colour / Texture Change', 'Hold for Review', 'high'),
('Ingredient Quality Issue', 'Hold for Review', 'medium'),
('Wrong Batch Code on Label', 'Hold for Review', 'medium')
ON CONFLICT (defect_type) DO UPDATE SET
  default_problem_level = EXCLUDED.default_problem_level,
  recommended_priority = EXCLUDED.recommended_priority,
  updated_at = CURRENT_TIMESTAMP;

-- 6. Workflow options for new dedicated rules
DELETE FROM defect_workflow_options
WHERE defect_type IN ('Colour / Texture Change', 'Ingredient Quality Issue', 'Wrong Batch Code on Label');

INSERT INTO defect_workflow_options (defect_type, option_type, option_value, sort_order) VALUES
('Colour / Texture Change', 'product_handling', 'Hold for Investigation', 1),
('Colour / Texture Change', 'product_handling', 'Discard Required', 2),
('Colour / Texture Change', 'product_handling', 'Release After Review', 3),
('Colour / Texture Change', 'machine_check', 'Review cooking process', 1),
('Colour / Texture Change', 'machine_check', 'Check retort process', 2),
('Colour / Texture Change', 'machine_check', 'Check storage condition', 3),
('Colour / Texture Change', 'machine_check', 'Review ingredient quality', 4),
('Colour / Texture Change', 'related_tool', 'Cooking Equipment', 1),
('Colour / Texture Change', 'related_tool', 'Cooking Record', 2),
('Colour / Texture Change', 'related_tool', 'Retort Machine', 3),
('Colour / Texture Change', 'related_tool', 'Retort Record', 4),
('Colour / Texture Change', 'related_tool', 'Temperature / Pressure Gauge', 5),
('Colour / Texture Change', 'related_tool', 'Storage Area', 6),
('Colour / Texture Change', 'root_cause', 'Cooking time issue', 1),
('Colour / Texture Change', 'root_cause', 'Cooking temperature issue', 2),
('Colour / Texture Change', 'root_cause', 'Retort temperature issue', 3),
('Colour / Texture Change', 'root_cause', 'Retort time issue', 4),
('Colour / Texture Change', 'root_cause', 'Product over-processed', 5),
('Colour / Texture Change', 'root_cause', 'Product under-processed', 6),
('Colour / Texture Change', 'root_cause', 'Ingredient quality issue', 7),
('Colour / Texture Change', 'root_cause', 'Storage condition issue', 8),
('Colour / Texture Change', 'root_cause', 'Other', 9),
('Ingredient Quality Issue', 'product_handling', 'Hold for Investigation', 1),
('Ingredient Quality Issue', 'product_handling', 'Discard Required', 2),
('Ingredient Quality Issue', 'product_handling', 'Release After Review', 3),
('Ingredient Quality Issue', 'machine_check', 'Check ingredient quality', 1),
('Ingredient Quality Issue', 'machine_check', 'Review supplier batch record', 2),
('Ingredient Quality Issue', 'machine_check', 'Inspect preparation area', 3),
('Ingredient Quality Issue', 'machine_check', 'Review worker hygiene process', 4),
('Ingredient Quality Issue', 'related_tool', 'Ingredient Record', 1),
('Ingredient Quality Issue', 'related_tool', 'Supplier Batch Record', 2),
('Ingredient Quality Issue', 'related_tool', 'Preparation Table', 3),
('Ingredient Quality Issue', 'related_tool', 'Cleaning Checklist', 4),
('Ingredient Quality Issue', 'related_tool', 'PPE', 5),
('Ingredient Quality Issue', 'root_cause', 'Ingredient not fresh', 1),
('Ingredient Quality Issue', 'root_cause', 'Ingredient quality not accepted', 2),
('Ingredient Quality Issue', 'root_cause', 'Wrong ingredient used', 3),
('Ingredient Quality Issue', 'root_cause', 'Supplier batch issue', 4),
('Ingredient Quality Issue', 'root_cause', 'Foreign material from ingredient', 5),
('Ingredient Quality Issue', 'root_cause', 'Preparation hygiene issue', 6),
('Ingredient Quality Issue', 'root_cause', 'Other', 7),
('Wrong Batch Code on Label', 'product_handling', 'Relabel Required', 1),
('Wrong Batch Code on Label', 'product_handling', 'Hold for Investigation', 2),
('Wrong Batch Code on Label', 'product_handling', 'Discard Required if cannot be corrected', 3),
('Wrong Batch Code on Label', 'machine_check', 'Verify batch code on date stamp / printer', 1),
('Wrong Batch Code on Label', 'machine_check', 'Check batch record before labelling', 2),
('Wrong Batch Code on Label', 'machine_check', 'Perform test print before production', 3),
('Wrong Batch Code on Label', 'machine_check', 'Review labelling checklist', 4),
('Wrong Batch Code on Label', 'related_tool', 'Date Stamp Printer', 1),
('Wrong Batch Code on Label', 'related_tool', 'Label Printer', 2),
('Wrong Batch Code on Label', 'related_tool', 'Batch Record', 3),
('Wrong Batch Code on Label', 'related_tool', 'Labelling Checklist', 4),
('Wrong Batch Code on Label', 'root_cause', 'Wrong batch code set', 1),
('Wrong Batch Code on Label', 'root_cause', 'Batch record not checked', 2),
('Wrong Batch Code on Label', 'root_cause', 'Date stamp / label setup not verified', 3),
('Wrong Batch Code on Label', 'root_cause', 'Test print not done', 4),
('Wrong Batch Code on Label', 'root_cause', 'Other', 5)
ON CONFLICT (defect_type, option_type, option_value) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_active = TRUE;
