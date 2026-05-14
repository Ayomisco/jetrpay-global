CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"resource_id" varchar(255) NOT NULL,
	"changes" json,
	"ip_address" varchar(45),
	"user_agent" text,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"card_number" varchar(255) NOT NULL,
	"card_number_last_four" varchar(4) NOT NULL,
	"expiry_month" integer NOT NULL,
	"expiry_year" integer NOT NULL,
	"cvv" varchar(255) NOT NULL,
	"holder_name" varchar(255) NOT NULL,
	"issuer" varchar(100) NOT NULL,
	"card_brand" varchar(20) NOT NULL,
	"daily_limit" bigint NOT NULL,
	"monthly_limit" bigint NOT NULL,
	"spent_today" bigint DEFAULT 0,
	"spent_this_month" bigint DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"activated_at" timestamp,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reason" varchar(50) NOT NULL,
	"details" json NOT NULL,
	"action_taken" text,
	"flagged_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contact_user_id" uuid NOT NULL,
	"nickname" varchar(255),
	"is_blocked" boolean DEFAULT false,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fingerprint" varchar(255) NOT NULL,
	"user_agent" text NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"device_name" varchar(255),
	"is_verified" boolean DEFAULT false,
	"last_used_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "devices_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kyc_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"document_image_url" text NOT NULL,
	"liveness_check_url" text,
	"smile_identity_reference" varchar(255),
	"verification_result" json,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" uuid,
	"rejection_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"business_type" varchar(100) NOT NULL,
	"business_registration" varchar(255) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"contact_phone" varchar(20) NOT NULL,
	"website" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "merchants_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"description" text,
	"redirect_url" text,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false,
	"used_at" timestamp,
	"used_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"description" text,
	"reference" varchar(255) NOT NULL,
	"idempotency_key" varchar(255),
	"metadata" json,
	"fees" json,
	"related_transaction_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_reference_unique" UNIQUE("reference"),
	CONSTRAINT "transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"bio" text,
	"avatar_url" text,
	"preferred_language" varchar(10) DEFAULT 'en',
	"preferred_currency" varchar(3) DEFAULT 'USD',
	"notification_settings" json,
	"privacy_settings" json,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"kyc_status" varchar(20) DEFAULT 'not_started' NOT NULL,
	"kyc_tier" varchar(20) DEFAULT 'tier_0' NOT NULL,
	"email_verified" boolean DEFAULT false,
	"phone_verified" boolean DEFAULT false,
	"profile_image_url" text,
	"date_of_birth" varchar(10),
	"nationality" varchar(100),
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"currency" varchar(3) NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"available_balance" bigint DEFAULT 0 NOT NULL,
	"reserved_balance" bigint DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"account_number" varchar(20),
	"account_name" varchar(255),
	"bank_code" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (
	 SELECT 1
	 FROM information_schema.tables
	 WHERE table_schema = 'public' AND table_name = 'cards'
 ) THEN
	ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "card_number_last_four" varchar(4);

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'cards' AND column_name = 'card_number'
	) THEN
		UPDATE "cards"
		SET "card_number_last_four" = RIGHT("card_number", 4)
		WHERE "card_number_last_four" IS NULL
			AND "card_number" IS NOT NULL
			AND char_length("card_number") >= 4;
	END IF;
 END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" ("resource");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cards_user_id_idx" ON "cards" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cards_status_idx" ON "cards" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cards_last_four_idx" ON "cards" ("card_number_last_four");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_flags_user_id_idx" ON "compliance_flags" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_flags_status_idx" ON "compliance_flags" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_flags_reason_idx" ON "compliance_flags" ("reason");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_user_id_idx" ON "contacts" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_user_contact_id_idx" ON "contacts" ("user_id","contact_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "devices_user_id_idx" ON "devices" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "devices_fingerprint_idx" ON "devices" ("fingerprint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kyc_submissions_user_id_idx" ON "kyc_submissions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kyc_submissions_status_idx" ON "kyc_submissions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kyc_submissions_tier_idx" ON "kyc_submissions" ("tier");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "merchants_user_id_idx" ON "merchants" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_links_merchant_id_idx" ON "payment_links" ("merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_links_is_used_idx" ON "payment_links" ("is_used");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_wallet_id_idx" ON "transactions" ("wallet_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_reference_idx" ON "transactions" ("reference");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_status_idx" ON "transactions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_created_at_idx" ON "transactions" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users" ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_kyc_status_idx" ON "users" ("kyc_status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_user_currency_idx" ON "wallets" ("user_id","currency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallets_user_id_idx" ON "wallets" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallets_status_idx" ON "wallets" ("status");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cards" ADD CONSTRAINT "cards_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_flags" ADD CONSTRAINT "compliance_flags_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contacts" ADD CONSTRAINT "contacts_contact_user_id_fk" FOREIGN KEY ("contact_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "merchants" ADD CONSTRAINT "merchants_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
