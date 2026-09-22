ALTER TABLE "business" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role_template_permission" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role_template_permission" DROP CONSTRAINT "role_template_permission_role_template_id_role_template_id_fk";
--> statement-breakpoint
ALTER TABLE "role_template_permission" ALTER COLUMN "role_template_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "role_template_permission" ALTER COLUMN "permission_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "role_template_permission" ADD COLUMN "tenent_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "role_template_permission" ADD CONSTRAINT "role_template_permission_role_tenant_fk" FOREIGN KEY ("role_template_id","tenent_id") REFERENCES "public"."role_template"("id","tenent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "business_signup_policy" ON "business" AS PERMISSIVE FOR INSERT TO public WITH CHECK (current_setting('app.signup_mode', true) = 'true');--> statement-breakpoint
CREATE POLICY "business_owner_access_policy" ON "business" AS PERMISSIVE FOR ALL TO public USING (
      id = current_tenant_id()
      AND (
        current_setting('app.is_tenant_owner', true) = 'true'
        OR current_setting('app.is_super_admin', true) = 'true'
      )
    ) WITH CHECK (
      id = current_tenant_id()
      AND (
        current_setting('app.is_tenant_owner', true) = 'true'
        OR current_setting('app.is_super_admin', true) = 'true'
      )
    );--> statement-breakpoint
CREATE POLICY "role_template_permission_read_policy" ON "role_template_permission" AS PERMISSIVE FOR SELECT TO public USING ("role_template_permission"."tenent_id" = current_tenant_id());--> statement-breakpoint
CREATE POLICY "role_template_permission_manage_policy" ON "role_template_permission" AS PERMISSIVE FOR ALL TO public USING (
            "role_template_permission"."tenent_id" = current_tenant_id()
            AND (
                current_setting('app.can_manage_role_permissions', true) = 'true'
                OR current_setting('app.is_super_admin', true) = 'true'
            )
        ) WITH CHECK (
            "role_template_permission"."tenent_id" = current_tenant_id()
            AND (
                current_setting('app.can_manage_role_permissions', true) = 'true'
                OR current_setting('app.is_super_admin', true) = 'true'
            )
        );