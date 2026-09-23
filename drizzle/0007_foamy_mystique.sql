CREATE TABLE "refresh_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "refresh_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_user_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "refresh_token_insert_policy" ON "refresh_token" AS PERMISSIVE FOR INSERT TO public WITH CHECK (
			current_setting('app.create_refresh_token', true) = 'true'
			AND token_hash IS NOT NULL
		);--> statement-breakpoint
CREATE POLICY "refresh_token_read_policy" ON "refresh_token" AS PERMISSIVE FOR SELECT TO public USING (
			token_hash = current_setting('app.refresh_token_hash', true)
			AND revoked_at IS NULL
		);--> statement-breakpoint
CREATE POLICY "refresh_token_update_policy" ON "refresh_token" AS PERMISSIVE FOR UPDATE TO public USING (token_hash = current_setting('app.refresh_token_hash', true)) WITH CHECK (token_hash IS NOT NULL);