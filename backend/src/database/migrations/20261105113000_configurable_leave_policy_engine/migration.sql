-- CreateEnum
CREATE TYPE "leave_adjustment_type" AS ENUM (
    'CREDIT',
    'DEBIT',
    'OPENING_CORRECTION',
    'CARRY_FORWARD_CORRECTION',
    'LAPSE'
);

-- AlterTable
ALTER TABLE "employees"
ADD COLUMN "policy_group_id" UUID;

-- AlterTable
ALTER TABLE "leave_requests"
ADD COLUMN "policy_id" UUID,
ADD COLUMN "policy_version" INTEGER,
ADD COLUMN "policy_snapshot" JSONB,
ADD COLUMN "duty_type" TEXT,
ADD COLUMN "organisation" TEXT,
ADD COLUMN "location" TEXT,
ADD COLUMN "reference_number" TEXT,
ADD COLUMN "attachment_name" TEXT,
ADD COLUMN "attachment_url" TEXT,
ADD COLUMN "restricted_holiday_id" TEXT,
ADD COLUMN "vacation_period_id" TEXT,
ADD COLUMN "coverage_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "operational_coverage_role" TEXT,
ADD COLUMN "operational_coverage_note" TEXT;

-- Backfill coverage_required and operational_coverage_role for pre-existing leave_requests
UPDATE "leave_requests"
SET "coverage_required" = CASE
  WHEN d."category" = 'TEACHING' THEN true
  WHEN d."category" = 'NON_TEACHING' AND lt."code" IN ('CL', 'EL', 'SPL_ML') THEN true
  ELSE false
END,
"operational_coverage_role" = CASE
  WHEN d."category" = 'NON_TEACHING' AND lt."code" IN ('CL', 'EL', 'SPL_ML') THEN d."name"
  ELSE NULL
END
FROM "employees" e, "designations" d, "leave_types" lt
WHERE "leave_requests"."employee_id" = e."id"
  AND e."designation_id" = d."id"
  AND "leave_requests"."leave_type_id" = lt."id";

-- CreateTable
CREATE TABLE "leave_policies" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "policy_year" TEXT NOT NULL,
    "employee_category" "staff_category" NOT NULL,
    "applies_to_all_categories" BOOLEAN NOT NULL DEFAULT false,
    "employment_type" "employment_type",
    "department_id" INTEGER,
    "policy_group_id" UUID,
    "leave_type_id" INTEGER,
    "annual_entitlement" DOUBLE PRECISION,
    "entitlement_unit" TEXT NOT NULL DEFAULT 'DAYS',
    "carry_forward_allowed" BOOLEAN NOT NULL DEFAULT false,
    "carry_forward_limit" DOUBLE PRECISION,
    "carry_forward_expiry_months" INTEGER,
    "lapse_at_year_end" BOOLEAN NOT NULL DEFAULT true,
    "half_day_allowed" BOOLEAN NOT NULL DEFAULT false,
    "minimum_notice_days" INTEGER NOT NULL DEFAULT 0,
    "maximum_consecutive_days" INTEGER,
    "minimum_service_days" INTEGER,
    "attachment_required" BOOLEAN NOT NULL DEFAULT false,
    "attachment_required_after_days" DOUBLE PRECISION,
    "reason_required" BOOLEAN NOT NULL DEFAULT true,
    "attendance_status" TEXT NOT NULL DEFAULT 'ON_LEAVE',
    "affects_timetable" BOOLEAN NOT NULL DEFAULT true,
    "requires_academic_coverage" BOOLEAN NOT NULL DEFAULT true,
    "requires_operational_coverage" BOOLEAN NOT NULL DEFAULT false,
    "reserve_pending_balance" BOOLEAN NOT NULL DEFAULT true,
    "approval_policy_key" TEXT DEFAULT 'STANDARD',
    "approval_status" TEXT NOT NULL DEFAULT 'AWAITING_APPROVAL',
    "calendar_policy_key" TEXT DEFAULT 'INSTITUTION_CALENDAR',
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balance_adjustments" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" INTEGER,
    "policy_id" UUID,
    "leave_code" TEXT NOT NULL,
    "policy_year" TEXT NOT NULL,
    "rollover_from_year" INTEGER,
    "adjustment_type" "leave_adjustment_type" NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_balance_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_policy_groups" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "employee_category" "staff_category" NOT NULL,
    "calendar_policy" TEXT DEFAULT 'INSTITUTION_CALENDAR',
    "attendance_policy" TEXT DEFAULT 'STANDARD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_policy_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "on_duty_duty_mappings" (
    "id" UUID NOT NULL,
    "duty_category" TEXT NOT NULL,
    "target_leave_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "on_duty_duty_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_policy_groups_name_key" ON "employee_policy_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "on_duty_duty_mappings_duty_category_key" ON "on_duty_duty_mappings"("duty_category");

-- CreateIndex
CREATE INDEX "leave_policies_policy_year_idx" ON "leave_policies"("policy_year");

-- CreateIndex
CREATE INDEX "leave_policies_employee_category_idx" ON "leave_policies"("employee_category");

-- CreateIndex
CREATE INDEX "leave_policies_active_idx" ON "leave_policies"("active");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_code_policy_year_employee_category_department__key" ON "leave_policies"("code", "policy_year", "employee_category", "department_id", "policy_group_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balance_adjustments_employee_id_leave_code_policy_yea_key" ON "leave_balance_adjustments"("employee_id", "leave_code", "policy_year", "adjustment_type", "rollover_from_year");

-- CreateIndex
CREATE INDEX "leave_balance_adjustments_employee_id_policy_year_idx" ON "leave_balance_adjustments"("employee_id", "policy_year");

-- CreateIndex
CREATE INDEX "leave_balance_adjustments_leave_code_idx" ON "leave_balance_adjustments"("leave_code");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_policy_group_id_fkey" FOREIGN KEY ("policy_group_id") REFERENCES "employee_policy_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_policy_group_id_fkey" FOREIGN KEY ("policy_group_id") REFERENCES "employee_policy_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "leave_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_adjustments" ADD CONSTRAINT "leave_balance_adjustments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_adjustments" ADD CONSTRAINT "leave_balance_adjustments_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_adjustments" ADD CONSTRAINT "leave_balance_adjustments_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "leave_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_adjustments" ADD CONSTRAINT "leave_balance_adjustments_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
