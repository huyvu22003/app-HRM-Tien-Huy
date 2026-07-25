-- Phase 2 hồ sơ nhân viên: bổ sung các trường có trong file danh sách nhân sự
-- (nhân thân, hợp đồng, giấy tờ, ngân hàng chi tiết, BHXH, người thân).
-- Các trường lương (cơ bản, trách nhiệm, phụ cấp...) đã có ở bảng compensation.

ALTER TABLE employees ADD COLUMN resign_reason TEXT;
ALTER TABLE employees ADD COLUMN contract_date_1 TEXT;
ALTER TABLE employees ADD COLUMN contract_date_2 TEXT;
ALTER TABLE employees ADD COLUMN contract_date_3 TEXT;
ALTER TABLE employees ADD COLUMN birth_year TEXT;
ALTER TABLE employees ADD COLUMN birth_place TEXT;
ALTER TABLE employees ADD COLUMN education TEXT;
ALTER TABLE employees ADD COLUMN temp_address TEXT;
ALTER TABLE employees ADD COLUMN cccd_issue_date TEXT;
ALTER TABLE employees ADD COLUMN cccd_issue_place TEXT;
ALTER TABLE employees ADD COLUMN nationality TEXT;
ALTER TABLE employees ADD COLUMN religion TEXT;
ALTER TABLE employees ADD COLUMN ethnicity TEXT;
ALTER TABLE employees ADD COLUMN bank_account TEXT;
ALTER TABLE employees ADD COLUMN bank_branch TEXT;
ALTER TABLE employees ADD COLUMN bhxh_no TEXT;
ALTER TABLE employees ADD COLUMN bhxh_increase_date TEXT;
ALTER TABLE employees ADD COLUMN bhxh_decrease_date TEXT;
ALTER TABLE employees ADD COLUMN relative_name TEXT;
ALTER TABLE employees ADD COLUMN relative_relation TEXT;
ALTER TABLE employees ADD COLUMN relative_phone TEXT;
