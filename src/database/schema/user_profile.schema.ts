import {pgTable,uuid,text,timestamp,boolean} from "drizzle-orm/pg-core"
import {business} from "./business.schema"
import { role_template } from "./role_template.schema"
import { relations, sql } from "drizzle-orm"
import { pgPolicy } from "drizzle-orm/pg-core"




export const user_profile = pgTable("user_profile", {
    id: uuid().defaultRandom().primaryKey(),
    tenent_id: uuid().notNull().references(() => business.id),
    role_template_id: uuid().notNull().references(() => role_template.id),
    fullname:text().notNull(),
    username:text().notNull().unique(),
    email:text().notNull().unique(),
    password:text().notNull(),
    is_active: boolean().default(false),
    created_at: timestamp().defaultNow(),
    updated_at: timestamp().defaultNow()
  }, (table) => [
    pgPolicy("user_profile_access_policy", {
      for: "all",
      to: "public",
      using: sql`current_user_id() = ${table.id} AND current_tenant_id() = ${table.tenent_id}`,
      withCheck: sql`current_user_id() = ${table.id} AND current_tenant_id() = ${table.tenent_id}`,
    }),
    pgPolicy("user_profile_signup_policy", {
      for: "insert",
      to: "public",
      withCheck: sql`current_setting('app.signup_mode', true) = 'true'`,
    }),
  ]).enableRLS()


//  Relations

export const userProfileRelations = relations(
  user_profile,
  ({ one }) => ({
    business: one(business, {
      fields: [user_profile.tenent_id],
      references: [business.id],
    }),
    roleTemplate: one(role_template, {
      fields: [user_profile.role_template_id],
      references: [role_template.id],
    }),
  }),
);
