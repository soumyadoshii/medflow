export const laboratoryWorkflowSchema = `
ALTER TABLE lab_orders ADD COLUMN test_code TEXT;
ALTER TABLE lab_orders ADD COLUMN result_data TEXT NOT NULL DEFAULT '{}';
ALTER TABLE lab_orders ADD COLUMN result_comments TEXT NOT NULL DEFAULT '';
ALTER TABLE lab_orders ADD COLUMN performed_at TEXT;
ALTER TABLE lab_orders ADD COLUMN released_at TEXT;
ALTER TABLE lab_orders ADD COLUMN released_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE lab_orders ADD COLUMN appointment_status TEXT NOT NULL DEFAULT 'Legacy';
ALTER TABLE lab_orders ADD COLUMN appointment_date TEXT;
ALTER TABLE lab_orders ADD COLUMN appointment_time TEXT;
ALTER TABLE lab_orders ADD COLUMN appointment_requested_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE lab_orders ADD COLUMN appointment_confirmed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE lab_orders ADD COLUMN appointment_requested_at TEXT;
ALTER TABLE lab_orders ADD COLUMN appointment_confirmed_at TEXT;

UPDATE lab_orders SET test_code = CASE lower(trim(test))
  WHEN 'complete blood count' THEN 'cbc'
  WHEN 'lipid panel' THEN 'lipid-panel'
  WHEN 'basic metabolic panel' THEN 'basic-metabolic-panel'
  WHEN 'hba1c' THEN 'hba1c'
  WHEN 'thyroid panel' THEN 'thyroid-panel'
  WHEN 'troponin i' THEN 'troponin-i'
  WHEN 'comprehensive metabolic panel' THEN 'comprehensive-metabolic-panel'
  ELSE test_code
END;

CREATE INDEX IF NOT EXISTS idx_lab_appointment_status_date
  ON lab_orders(appointment_status, appointment_date, appointment_time);
`;
