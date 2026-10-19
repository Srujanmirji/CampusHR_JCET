-- CreateEnum
CREATE TYPE "coverage_kind" AS ENUM ('SUBSTITUTE', 'NOT_NEEDED');

-- CreateTable
CREATE TABLE "substitutions" (
    "id" UUID NOT NULL,
    "leave_request_id" UUID NOT NULL,
    "timetable_entry_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "kind" "coverage_kind" NOT NULL,
    "substitute_id" UUID,
    "note" TEXT,
    "assigned_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "substitutions_substitute_id_date_idx" ON "substitutions"("substitute_id", "date");

-- CreateIndex
CREATE INDEX "substitutions_leave_request_id_idx" ON "substitutions"("leave_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "substitutions_timetable_entry_id_date_key" ON "substitutions"("timetable_entry_id", "date");

-- AddForeignKey
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_timetable_entry_id_fkey" FOREIGN KEY ("timetable_entry_id") REFERENCES "timetable_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_substitute_id_fkey" FOREIGN KEY ("substitute_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A substitute exactly when the kind says so; an arrangement note otherwise.
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_kind_check" CHECK (("kind" = 'SUBSTITUTE' AND "substitute_id" IS NOT NULL) OR ("kind" = 'NOT_NEEDED' AND "substitute_id" IS NULL AND "note" IS NOT NULL));
