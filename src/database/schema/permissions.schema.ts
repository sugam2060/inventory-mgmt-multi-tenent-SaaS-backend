import {pgTable,uuid,text} from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"
import { role_template_permission } from "./role_template_permission.schema"
import { pgPolicy } from "drizzle-orm/pg-core"




export const permissions = pgTable("permissions", {
    id:uuid().defaultRandom().primaryKey(),
    permission_name: text().unique().notNull(),
    description: text().notNull()
}, () => [
    pgPolicy("permissions_read_policy", {
        for: "select",
        to: "public",
        using: sql`true`,
    }),
    pgPolicy("permissions_super_admin_policy", {
        for: "all",
        to: "public",
        using: sql`current_setting('app.is_super_admin', true) = 'true'`,
        withCheck: sql`current_setting('app.is_super_admin', true) = 'true'`,
    }),
]).enableRLS()




// Relation

export const permissionsRelations = relations(permissions, ({ many }) => ({
    roleTemplatePermissions: many(role_template_permission),
}))