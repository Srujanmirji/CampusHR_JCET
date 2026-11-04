-- CreateEnum
CREATE TYPE "candidate_status" AS ENUM ('OFFER_PENDING', 'OFFER_ISSUED', 'OFFER_ACCEPTED', 'DOCUMENTS_SUBMITTED', 'ONBOARDED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "onboarding_candidates" (
    "id" UUID NOT NULL,
    "appointment_ref_no" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "department_id" INTEGER NOT NULL,
    "designation_id" INTEGER NOT NULL,
    "employment_type" "employment_type" NOT NULL,
    "qualification" TEXT NOT NULL,
    "specialization" TEXT,
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "expected_joining_date" DATE NOT NULL,
    "status" "candidate_status" NOT NULL DEFAULT 'OFFER_PENDING',
    "pay_scale" TEXT NOT NULL,
    "basic_pay" DOUBLE PRECISION NOT NULL,
    "agp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "da_percent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "hra_percent" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "gross_salary" DOUBLE PRECISION NOT NULL,
    "probation_months" INTEGER NOT NULL DEFAULT 12,
    "notice_period_months" INTEGER NOT NULL DEFAULT 3,
    "documents_checklist" JSONB,
    "employee_id" UUID,
    "issued_by_id" UUID,
    "issued_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_candidates_appointment_ref_no_key" ON "onboarding_candidates"("appointment_ref_no");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_candidates_email_key" ON "onboarding_candidates"("email");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_candidates_employee_id_key" ON "onboarding_candidates"("employee_id");

-- CreateIndex
CREATE INDEX "onboarding_candidates_department_id_idx" ON "onboarding_candidates"("department_id");

-- CreateIndex
CREATE INDEX "onboarding_candidates_designation_id_idx" ON "onboarding_candidates"("designation_id");

-- CreateIndex
CREATE INDEX "onboarding_candidates_status_idx" ON "onboarding_candidates"("status");

-- CreateIndex
CREATE INDEX "onboarding_candidates_appointment_ref_no_idx" ON "onboarding_candidates"("appointment_ref_no");

-- AddForeignKey
ALTER TABLE "onboarding_candidates" ADD CONSTRAINT "onboarding_candidates_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_candidates" ADD CONSTRAINT "onboarding_candidates_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_candidates" ADD CONSTRAINT "onboarding_candidates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_candidates" ADD CONSTRAINT "onboarding_candidates_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
