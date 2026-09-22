import {pgTable,uuid,text,timestamp,pgPolicy} from "drizzle-orm/pg-core"
import { user_profile } from "./user_profile.schema";
import { relations, sql } from "drizzle-orm";
import { role_template } from "./role_template.schema";




export const business = pgTable("business", {
    id: uuid().defaultRandom().primaryKey(),
    name:text().notNull(),
    slug:text().notNull().unique(),
    pan_no: text().notNull().unique(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at:timestamp().defaultNow().notNull()
}, () => [
  pgPolicy("business_signup_policy", {
    for: "insert",
    to: "public",
    withCheck: sql`current_setting('app.signup_mode', true) = 'true'`,
  }),
  pgPolicy("business_owner_access_policy", {
    for: "all",
    to: "public",
    using: sql`
      id = current_tenant_id()
      AND (
        current_setting('app.is_tenant_owner', true) = 'true'
        OR current_setting('app.is_super_admin', true) = 'true'
      )
    `,
    withCheck: sql`
      id = current_tenant_id()
      AND (
        current_setting('app.is_tenant_owner', true) = 'true'
        OR current_setting('app.is_super_admin', true) = 'true'
      )
    `,
  }),
]).enableRLS()



// Relations

export const businessRelations = relations(
  business,
  ({ many }) => ({
    userProfiles: many(user_profile),
    roleTemplates: many(role_template),
  }),
);