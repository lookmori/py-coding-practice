-- Step 1: Add new enum values only (must commit before using them)
CREATE TYPE "BankVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TEACHER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STUDENT';
