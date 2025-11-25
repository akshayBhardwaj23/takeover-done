-- AlterEnum: Add META_ADS, GOOGLE_ADS, and GOOGLE_ANALYTICS to ConnectionType enum
-- This migration adds the missing enum values safely using exception handling

-- Function to safely add enum value
CREATE OR REPLACE FUNCTION add_enum_value_if_not_exists(
    enum_type_name TEXT,
    enum_value TEXT
) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = enum_type_name
        AND e.enumlabel = enum_value
    ) THEN
        EXECUTE format('ALTER TYPE %I ADD VALUE %L', enum_type_name, enum_value);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add enum values safely
SELECT add_enum_value_if_not_exists('ConnectionType', 'META_ADS');
SELECT add_enum_value_if_not_exists('ConnectionType', 'GOOGLE_ADS');
SELECT add_enum_value_if_not_exists('ConnectionType', 'GOOGLE_ANALYTICS');

-- Clean up the helper function
DROP FUNCTION add_enum_value_if_not_exists(TEXT, TEXT);

