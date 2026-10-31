-- CreateTable
CREATE TABLE "push_devices" (
    "id" UUID NOT NULL,
    "token" VARCHAR(256) NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "platform" VARCHAR(7) NOT NULL,
    "project_id" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_deliveries" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticket_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_devices_token_key" ON "push_devices"("token");

-- CreateIndex
CREATE UNIQUE INDEX "push_devices_session_id_key" ON "push_devices"("session_id");

-- CreateIndex
CREATE INDEX "push_devices_user_id_idx" ON "push_devices"("user_id");

-- CreateIndex
CREATE INDEX "push_deliveries_next_attempt_at_idx" ON "push_deliveries"("next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_deliveries_notification_id_device_id_key" ON "push_deliveries"("notification_id", "device_id");

-- AddForeignKey
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "refresh_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "push_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE push_devices ADD CONSTRAINT push_device_platform CHECK (platform IN ('ios', 'android'));
ALTER TABLE push_deliveries ADD CONSTRAINT push_attempts_nonnegative CHECK (attempts >= 0);
