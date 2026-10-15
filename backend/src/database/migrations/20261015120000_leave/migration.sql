-- CreateEnum
CREATE TYPE "leave_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "half_day_session" AS ENUM ('FIRST', 'SECOND');

-- CreateTable
CREATE TABLE "leave_types" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yearly_quota" DOUBLE PRECISION,
    "allow_half_day" BOOLEAN NOT NULL DEFAULT false,
    "carry_forward_max" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "department_id" INTEGER NOT NULL,
    "leave_type_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "half_day" "half_day_session",
    "days" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "leave_status" NOT NULL DEFAULT 'PENDING',
    "approver_roles" TEXT[],
    "pending_role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_decisions" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "step" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "decider_user_id" UUID NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "note" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_code_key" ON "leave_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_name_key" ON "leave_types"("name");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_start_date_idx" ON "leave_requests"("employee_id", "start_date");

-- CreateIndex
CREATE INDEX "leave_requests_status_pending_role_department_id_idx" ON "leave_requests"("status", "pending_role", "department_id");

-- CreateIndex
CREATE INDEX "leave_decisions_request_id_idx" ON "leave_decisions"("request_id");

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_decisions" ADD CONSTRAINT "leave_decisions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_decisions" ADD CONSTRAINT "leave_decisions_decider_user_id_fkey" FOREIGN KEY ("decider_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Day counts and quotas are whole or half days (Prisma does not model CHECKs).
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_amounts_check" CHECK (("yearly_quota" IS NULL OR ("yearly_quota" >= 0 AND "yearly_quota" * 2 = floor("yearly_quota" * 2))) AND "carry_forward_max" >= 0 AND "carry_forward_max" * 2 = floor("carry_forward_max" * 2));
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_range_check" CHECK ("start_date" <= "end_date" AND "days" > 0 AND ("half_day" IS NULL OR ("start_date" = "end_date" AND "days" = 0.5)));
