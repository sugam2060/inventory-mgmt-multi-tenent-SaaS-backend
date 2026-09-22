CREATE TABLE "business" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"pan_no" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_slug_unique" UNIQUE("slug"),
	CONSTRAINT "business_pan_no_unique" UNIQUE("pan_no")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission_name" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "permissions_permission_name_unique" UNIQUE("permission_name")
);
--> statement-breakpoint
CREATE TABLE "role_template_permission" (
	"role_template_id" uuid,
	"permission_id" uuid,
	CONSTRAINT "role_template_permission_role_template_id_permission_id_pk" PRIMARY KEY("role_template_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "role_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenent_id" uuid NOT NULL,
	"template_name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "role_template" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenent_id" uuid NOT NULL,
	"role_template_id" uuid NOT NULL,
	"fullname" text NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_profile_username_unique" UNIQUE("username"),
	CONSTRAINT "user_profile_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user_profile" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role_template_permission" ADD CONSTRAINT "role_template_permission_role_template_id_role_template_id_fk" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_template_permission" ADD CONSTRAINT "role_template_permission_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_template" ADD CONSTRAINT "role_template_tenent_id_business_id_fk" FOREIGN KEY ("tenent_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_tenent_id_business_id_fk" FOREIGN KEY ("tenent_id") REFERENCES "public"."business"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_role_template_id_role_template_id_fk" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "Role_template_creation_policy" ON "role_template" AS PERMISSIVE FOR ALL TO public;--> statement-breakpoint
CREATE POLICY "user_profile_access_policy" ON "user_profile" AS PERMISSIVE FOR ALL TO public USING (current_user_id() = "user_profile"."id" AND current_tenant_id() = "user_profile"."tenent_id") WITH CHECK (current_user_id() = "user_profile"."id" AND current_tenant_id() = "user_profile"."tenent_id");--> statement-breakpoint
CREATE POLICY "user_profile_signup_policy" ON "user_profile" AS PERMISSIVE FOR INSERT TO public WITH CHECK (current_setting('app.signup_mode', true) = 'true');







-- POSTGRESQL FUNCTIONS
-- Returns the authenticated application's user ID
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT current_setting('app.user_id', true)::uuid;
$$;


-- Returns the tenant/business ID of the authenticated user
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT tenent_id
    FROM user_profile
    WHERE id = current_user_id();
$$;