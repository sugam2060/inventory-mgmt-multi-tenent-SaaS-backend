ALTER TABLE "role_template_permission" DROP CONSTRAINT "role_template_permission_role_tenant_fk";
--> statement-breakpoint
ALTER TABLE "user_profile" DROP CONSTRAINT "user_profile_role_template_tenant_fk";
--> statement-breakpoint
DROP INDEX "role_template_id_tenant_unique";--> statement-breakpoint
ALTER TABLE "role_template_permission" ADD CONSTRAINT "role_template_permission_role_template_id_role_template_id_fk" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_role_template_id_role_template_id_fk" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_template"("id") ON DELETE no action ON UPDATE no action;