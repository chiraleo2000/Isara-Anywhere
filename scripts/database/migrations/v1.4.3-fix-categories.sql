-- Fix Medical Content Categories to match frontend filters
-- Run this script to update existing data

-- Fix category names (underscore to hyphen format)
UPDATE medical_content SET category = 'chronic-disease' WHERE category = 'chronic_disease';
UPDATE medical_content SET category = 'preventive-care' WHERE category = 'prevention';
UPDATE medical_content SET category = 'general-health' WHERE category = 'general_health';
UPDATE medical_content SET category = 'mental-health' WHERE category = 'mental_health';
UPDATE medical_content SET category = 'first-aid' WHERE category = 'first_aid';

-- Fix lifestyle to proper categories (nutrition and exercise)
UPDATE medical_content SET category = 'nutrition' WHERE category = 'lifestyle' AND (
  title_thai ILIKE '%โภชนาการ%' OR 
  title_thai ILIKE '%อาหาร%' OR
  title_english ILIKE '%nutrition%' OR
  title_english ILIKE '%diet%' OR
  title_english ILIKE '%food%'
);

UPDATE medical_content SET category = 'exercise' WHERE category = 'lifestyle' AND (
  title_thai ILIKE '%ออกกำลังกาย%' OR
  title_thai ILIKE '%กีฬา%' OR
  title_english ILIKE '%exercise%' OR
  title_english ILIKE '%fitness%' OR
  title_english ILIKE '%workout%'
);

-- Default remaining lifestyle to general-health
UPDATE medical_content SET category = 'general-health' WHERE category = 'lifestyle';

-- Verify categories now match frontend filter options
SELECT category, COUNT(*) as count 
FROM medical_content 
WHERE status = 'published'
GROUP BY category 
ORDER BY category;
