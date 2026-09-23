ALTER TABLE "role_template_permission" DROP CONSTRAINT "role_template_permission_role_template_id_role_template_id_fk";
--> statement-breakpoint
ALTER TABLE "role_template" DROP CONSTRAINT "role_template_tenent_id_business_id_fk";
--> statement-breakpoint
ALTER TABLE "user_profile" DROP CONSTRAINT "user_profile_tenent_id_business_id_fk";
--> statement-breakpoint
ALTER TABLE "user_profile" DROP CONSTRAINT "user_profile_role_template_id_role_template_id_fk";
--> statement-breakpoint
ALTER TABLE "role_template_permission" ADD CONSTRAINT "role_template_permission_role_template_id_role_template_id_fk" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_template" ADD CONSTRAINT "role_template_tenent_id_business_id_fk" FOREIGN KEY ("tenent_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_tenent_id_business_id_fk" FOREIGN KEY ("tenent_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_role_template_id_role_template_id_fk" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_template"("id") ON DELETE cascade ON UPDATE no action;