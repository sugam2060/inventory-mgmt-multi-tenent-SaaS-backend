ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_profile" DROP CONSTRAINT "user_profile_role_template_id_role_template_id_fk";
--> statement-breakpoint
ALTER TABLE "role_template" ADD COLUMN "is_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_role_template_tenant_fk" FOREIGN KEY ("role_template_id","tenent_id") REFERENCES "public"."role_template"("id","tenent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "role_template_one_owner_per_tenant" ON "role_template" USING btree ("tenent_id") WHERE "role_template"."is_owner" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "role_template_id_tenant_unique" ON "role_template" USING btree ("id","tenent_id");--> statement-breakpoint
ALTER POLICY "Role_template_creation_policy" ON "role_template" RENAME TO "role_template_create_policy";--> statement-breakpoint
CREATE POLICY "permissions_read_policy" ON "permissions" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "permissions_super_admin_policy" ON "permissions" AS PERMISSIVE FOR ALL TO public USING (current_setting('app.is_super_admin', true) = 'true') WITH CHECK (current_setting('app.is_super_admin', true) = 'true');