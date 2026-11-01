ALTER TABLE "users" ADD COLUMN "auth_version" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "password_reset_challenges" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "account_key" TEXT NOT NULL,
  "otp_hash" TEXT NOT NULL,
  "password_stamp" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "encrypted_mail" TEXT,
  "delivery_attempts" INTEGER NOT NULL DEFAULT 0,
  "next_delivery_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lease_until" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "password_reset_challenges_account_key_created_at_idx" ON "password_reset_challenges"("account_key", "created_at");
CREATE INDEX "password_reset_challenges_next_delivery_at_idx" ON "password_reset_challenges"("next_delivery_at");
CREATE TABLE "password_reset_throttles" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "started_at" TIMESTAMP(3) NOT NULL,
  "last_attempt" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0
);
