-- Step 2: Apply table changes (after enum values are committed)
ALTER TABLE "ExamAnswer" ADD COLUMN IF NOT EXISTS "comment" TEXT;

ALTER TABLE "PracticeAnswer" ADD COLUMN IF NOT EXISTS "comment" TEXT;

ALTER TABLE "QuestionBank"
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "schoolId" TEXT,
  ADD COLUMN IF NOT EXISTS "visibility" "BankVisibility" NOT NULL DEFAULT 'PRIVATE';

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "schoolId" TEXT,
  ADD COLUMN IF NOT EXISTS "teacherId" TEXT,
  ALTER COLUMN "role" SET DEFAULT 'STUDENT';

CREATE TABLE IF NOT EXISTS "School" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "School_code_key" ON "School"("code");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuestionBank_createdById_fkey') THEN
    ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuestionBank_schoolId_fkey') THEN
    ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_schoolId_fkey"
      FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_schoolId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey"
      FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_teacherId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
