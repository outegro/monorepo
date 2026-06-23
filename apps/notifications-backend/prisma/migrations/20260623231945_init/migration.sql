-- CreateTable
CREATE TABLE "delivery_log" (
    "id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "delivery_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferences" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_links" (
    "user_id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "delivery_log_user_id_idx" ON "delivery_log"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_log_event_id_channel_key" ON "delivery_log"("event_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "preferences_user_id_type_channel_key" ON "preferences"("user_id", "type", "channel");

-- CreateIndex
CREATE INDEX "telegram_links_chat_id_idx" ON "telegram_links"("chat_id");
