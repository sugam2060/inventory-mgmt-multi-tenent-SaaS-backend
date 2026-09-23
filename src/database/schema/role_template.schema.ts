import {pgTable,uuid,text,timestamp,boolean,uniqueIndex,pgPolicy} from "drizzle-orm/pg-core"
import {business} from "./business.schema"
import { relations } from "drizzle-orm"
import { user_profile } from "./user_profile.schema"
import { role_template_permission } from "./role_template_permission.schema"
import { sql } from "drizzle-orm"




export const role_template = pgTable("role_template", {
    id: uuid().defaultRandom().primaryKey(),
    tenent_id: uuid().notNull().references(() => business.id, { onDelete: 'cascade' }),
    template_name: text().notNull(),
    is_owner: boolean().notNull().default(false),
    created_at: timestamp().defaultNow()
},
(table) => [
    uniqueIndex("role_template_one_owner_per_tenant")
        .on(table.tenent_id)
        .where(sql`${table.is_owner} = true`),
    pgPolicy("role_template_create_policy", {
        for: "insert",
        to: "public",
        withCheck: sql`
            current_tenant_id() = ${table.tenent_id}
            AND current_setting('app.can_create_role_template', true) = 'true'
        `,
    }),
    pgPolicy("role_template_signup_policy", {
        for: "insert",
        to: "public",
        withCheck: sql`current_setting('app.signup_mode', true) = 'true'`,
    }),
]).enableRLS()



// Relations

export const roleTemplateRelations = relations(role_template, ({ one, many }) => ({
    business: one(business, {
        fields: [role_template.tenent_id],
        references: [business.id]
    }),
    userProfiles: many(user_profile),
    roleTemplatePermissions: many(role_template_permission),
}))