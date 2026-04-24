-- Add new UserRole enum values (must be in separate migration from usage)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TEACHER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STUDENT';

-- Create BankVisibility enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BankVisibility') THEN
    CREATE TYPE "BankVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
  END IF;
END $$;
