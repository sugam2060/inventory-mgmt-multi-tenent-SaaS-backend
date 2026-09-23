import {pgTable,uuid,primaryKey,pgPolicy} from "drizzle-orm/pg-core"
import { role_template } from "./role_template.schema"
import { relations, sql } from "drizzle-orm"
import { permissions } from "./permissions.schema"



export const role_template_permission = pgTable("role_template_permission", {
    role_template_id: uuid().notNull().references(() => role_template.id, { onDelete: 'cascade' }),
    tenent_id: uuid().notNull(),
    permission_id: uuid().notNull().references(() => permissions.id)
},
(table) => [
    primaryKey({
        columns:[
            table.role_template_id,
            table.permission_id
        ]
    }),
    
    pgPolicy("role_template_permission_read_policy", {
        for: "select",
        to: "public",
        using: sql`${table.tenent_id} = current_tenant_id()`,
    }),
    pgPolicy("role_template_permission_manage_policy", {
        for: "all",
        to: "public",
        using: sql`
            ${table.tenent_id} = current_tenant_id()
            AND (
                current_setting('app.can_manage_role_permissions', true) = 'true'
                OR current_setting('app.is_super_admin', true) = 'true'
            )
        `,
        withCheck: sql`
            ${table.tenent_id} = current_tenant_id()
            AND (
                current_setting('app.can_manage_role_permissions', true) = 'true'
                OR current_setting('app.is_super_admin', true) = 'true'
            )
        `,
    }),
]
)




// Relations

export const roleTemplatePermissionRelations = relations(
    role_template_permission,
    ({ one }) => ({
        roleTemplate: one(role_template, {
            fields: [role_template_permission.role_template_id],
            references: [role_template.id],
        }),
        permission: one(permissions, {
            fields: [role_template_permission.permission_id],
            references: [permissions.id],
        }),
    }),
)