-- CreateTable
CREATE TABLE "workload_thresholds" (
    "designation_id" INTEGER NOT NULL,
    "min_hours" INTEGER NOT NULL,
    "max_hours" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workload_thresholds_pkey" PRIMARY KEY ("designation_id")
);

-- AddForeignKey
ALTER TABLE "workload_thresholds" ADD CONSTRAINT "workload_thresholds_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A band must be non-empty (Prisma does not model CHECK constraints).
ALTER TABLE "workload_thresholds" ADD CONSTRAINT "workload_thresholds_band_check" CHECK ("min_hours" >= 0 AND "min_hours" <= "max_hours");
