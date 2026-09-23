import { pgTable, uuid, text, timestamp, pgPolicy, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user_profile } from "./user_profile.schema";

export const refresh_token = pgTable("refresh_token", {
	id: uuid().defaultRandom().primaryKey(),
	user_id: uuid().notNull().references(() => user_profile.id, { onDelete: "cascade" }),
	token_hash: text().notNull().unique(),
	expires_at: timestamp().notNull(),
	revoked_at: timestamp(),
	created_at: timestamp().defaultNow().notNull(),
}, (table) => [
	uniqueIndex("refresh_token_one_per_user").on(table.user_id),
	pgPolicy("refresh_token_insert_policy", {
		for: "insert",
		to: "public",
		withCheck: sql`
			current_setting('app.create_refresh_token', true) = 'true'
			AND token_hash IS NOT NULL
		`,
	}),
	pgPolicy("refresh_token_read_policy", {
		for: "select",
		to: "public",
		using: sql`
			token_hash = current_setting('app.refresh_token_hash', true)
			AND revoked_at IS NULL
		`,
	}),
	pgPolicy("refresh_token_update_policy", {
		for: "update",
		to: "public",
		using: sql`token_hash = current_setting('app.refresh_token_hash', true)`,
		withCheck: sql`token_hash IS NOT NULL`,
	}),
	pgPolicy("refresh_token_delete_policy", {
		for: "delete",
		to: "public",
		using: sql`current_setting('app.rotate_refresh_token', true) = 'true'`,
	}),
]).enableRLS();

export const refreshTokenRelations = relations(refresh_token, ({ one }) => ({
	user: one(user_profile, {
		fields: [refresh_token.user_id],
		references: [user_profile.id],
	}),
}));
