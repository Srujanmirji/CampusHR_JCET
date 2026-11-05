-- CreateEnum
CREATE TYPE "semester_type" AS ENUM ('ODD', 'EVEN');

-- CreateEnum
CREATE TYPE "calendar_day_type" AS ENUM (
    'WORKING_DAY',
    'WEEKLY_OFF',
    'PUBLIC_HOLIDAY',
    'RESTRICTED_HOLIDAY',
    'VACATION',
    'EXAMINATION',
    'INSTITUTIONAL_EVENT',
    'ACADEMIC_EVENT',
    'SPECIAL_WORKING_DAY'
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semesters" (
    "id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "semester_type" NOT NULL DEFAULT 'ODD',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "teaching_start_date" DATE,
    "teaching_end_date" DATE,
    "exam_start_date" DATE,
    "exam_end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_days" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "semester_id" UUID,
    "day_type" "calendar_day_type" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "is_working_day" BOOLEAN NOT NULL,
    "department_id" INTEGER,
    "applies_to_employee_type" TEXT,
    "source" TEXT DEFAULT 'MANUAL',
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restricted_holidays" (
    "id" UUID NOT NULL,
    "calendar_day_id" UUID,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "annual_year" TEXT NOT NULL,
    "eligible_employee_types" TEXT DEFAULT 'ALL',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restricted_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_working_patterns" (
    "id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "day_name" TEXT NOT NULL,
    "is_working_day" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_working_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_name_key" ON "academic_years"("name");
CREATE INDEX "academic_years_is_current_idx" ON "academic_years"("is_current");

-- CreateIndex
CREATE INDEX "semesters_academic_year_id_idx" ON "semesters"("academic_year_id");
CREATE INDEX "semesters_is_current_idx" ON "semesters"("is_current");

-- CreateIndex
CREATE INDEX "calendar_days_date_idx" ON "calendar_days"("date");
CREATE INDEX "calendar_days_academic_year_id_idx" ON "calendar_days"("academic_year_id");
CREATE INDEX "calendar_days_semester_id_idx" ON "calendar_days"("semester_id");
CREATE INDEX "calendar_days_day_type_idx" ON "calendar_days"("day_type");
CREATE INDEX "calendar_days_department_id_idx" ON "calendar_days"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "restricted_holidays_calendar_day_id_key" ON "restricted_holidays"("calendar_day_id");
CREATE INDEX "restricted_holidays_date_idx" ON "restricted_holidays"("date");
CREATE INDEX "restricted_holidays_annual_year_idx" ON "restricted_holidays"("annual_year");
CREATE INDEX "restricted_holidays_active_idx" ON "restricted_holidays"("active");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_working_patterns_day_of_week_key" ON "weekly_working_patterns"("day_of_week");

-- AddForeignKey
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_days" ADD CONSTRAINT "calendar_days_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_days" ADD CONSTRAINT "calendar_days_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_days" ADD CONSTRAINT "calendar_days_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_days" ADD CONSTRAINT "calendar_days_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricted_holidays" ADD CONSTRAINT "restricted_holidays_calendar_day_id_fkey" FOREIGN KEY ("calendar_day_id") REFERENCES "calendar_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
