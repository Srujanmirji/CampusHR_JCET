-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('VTU_SEMESTER', 'INTERNAL_ASSESSMENT', 'LAB_EXAM');

-- CreateEnum
CREATE TYPE "ExamSessionStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExamDutySession" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "ExamDutyRole" AS ENUM ('CHIEF_SUPERINTENDENT', 'DEPUTY_CHIEF', 'INVIGILATOR', 'RELIEVER', 'SQUAD');

-- CreateEnum
CREATE TYPE "ExamDutyStatus" AS ENUM ('ASSIGNED', 'CONFIRMED', 'SWAP_REQUESTED', 'SWAPPED', 'ABSENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ExamDutySwapStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CircularCategory" AS ENUM ('ACADEMIC', 'ADMINISTRATIVE', 'HOLIDAY', 'VTU_NOTIFICATION', 'EXAMINATION', 'EVENT', 'URGENT');

-- CreateEnum
CREATE TYPE "CircularPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CircularAudience" AS ENUM ('ALL', 'TEACHING_ONLY', 'NON_TEACHING_ONLY', 'DEPARTMENT');

-- CreateTable
CREATE TABLE "exam_sessions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "exam_type" "ExamType" NOT NULL DEFAULT 'VTU_SEMESTER',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "ExamSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_duties" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "session_time" "ExamDutySession" NOT NULL DEFAULT 'MORNING',
    "reporting_time" TEXT NOT NULL DEFAULT '09:00 AM',
    "room_id" INTEGER,
    "faculty_id" UUID NOT NULL,
    "role" "ExamDutyRole" NOT NULL DEFAULT 'INVIGILATOR',
    "status" "ExamDutyStatus" NOT NULL DEFAULT 'ASSIGNED',
    "swap_with_faculty_id" UUID,
    "swap_reason" TEXT,
    "swap_status" "ExamDutySwapStatus",
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_duties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circulars" (
    "id" UUID NOT NULL,
    "circular_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "CircularCategory" NOT NULL DEFAULT 'ADMINISTRATIVE',
    "priority" "CircularPriority" NOT NULL DEFAULT 'NORMAL',
    "target_audience" "CircularAudience" NOT NULL DEFAULT 'ALL',
    "target_department_id" INTEGER,
    "attachment_url" TEXT,
    "attachment_name" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circulars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circular_read_receipts" (
    "id" UUID NOT NULL,
    "circular_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "circular_read_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_duties_faculty_id_date_session_time_key" ON "exam_duties"("faculty_id", "date", "session_time");

-- CreateIndex
CREATE INDEX "exam_duties_session_id_idx" ON "exam_duties"("session_id");

-- CreateIndex
CREATE INDEX "exam_duties_date_idx" ON "exam_duties"("date");

-- CreateIndex
CREATE INDEX "exam_duties_faculty_id_idx" ON "exam_duties"("faculty_id");

-- CreateIndex
CREATE UNIQUE INDEX "circulars_circular_number_key" ON "circulars"("circular_number");

-- CreateIndex
CREATE INDEX "circulars_published_at_idx" ON "circulars"("published_at");

-- CreateIndex
CREATE INDEX "circulars_category_idx" ON "circulars"("category");

-- CreateIndex
CREATE INDEX "circulars_target_audience_idx" ON "circulars"("target_audience");

-- CreateIndex
CREATE UNIQUE INDEX "circular_read_receipts_circular_id_user_id_key" ON "circular_read_receipts"("circular_id", "user_id");

-- CreateIndex
CREATE INDEX "circular_read_receipts_circular_id_idx" ON "circular_read_receipts"("circular_id");

-- CreateIndex
CREATE INDEX "circular_read_receipts_user_id_idx" ON "circular_read_receipts"("user_id");

-- AddForeignKey
ALTER TABLE "exam_duties" ADD CONSTRAINT "exam_duties_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "exam_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_duties" ADD CONSTRAINT "exam_duties_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_duties" ADD CONSTRAINT "exam_duties_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_duties" ADD CONSTRAINT "exam_duties_swap_with_faculty_id_fkey" FOREIGN KEY ("swap_with_faculty_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circulars" ADD CONSTRAINT "circulars_target_department_id_fkey" FOREIGN KEY ("target_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circulars" ADD CONSTRAINT "circulars_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circular_read_receipts" ADD CONSTRAINT "circular_read_receipts_circular_id_fkey" FOREIGN KEY ("circular_id") REFERENCES "circulars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circular_read_receipts" ADD CONSTRAINT "circular_read_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
