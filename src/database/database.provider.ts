import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/schema";

export const DATABASE_ENGINE = Symbol("DATABASE_ENGINE");

export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseEngine {
	db: Database;
	pool: Pool;
	onApplicationShutdown: () => Promise<void>;
}

function getInteger(
	configService: ConfigService,
	name: string,
	fallback: number,
): number {
	const value = configService.get<string>(name);

	if (value === undefined) {
		return fallback;
	}

	const parsedValue = Number(value);

	if (!Number.isInteger(parsedValue) || parsedValue < 0) {
		throw new Error(`${name} must be a non-negative integer.`);
	}

	return parsedValue;
}

export const databaseProvider: Provider = {
	provide: DATABASE_ENGINE,
	inject: [ConfigService],
	useFactory: (configService: ConfigService): DatabaseEngine => {
		const databaseUrl = configService.get<string>("DATABASE_URL");

		if (!databaseUrl) {
			throw new Error("DATABASE_URL is missing.");
		}

		const pool = new Pool({
			connectionString: databaseUrl,
			max: getInteger(configService, "DATABASE_POOL_MAX", 10),
			min: getInteger(configService, "DATABASE_POOL_MIN", 2),
			idleTimeoutMillis: getInteger(
				configService,
				"DATABASE_IDLE_TIMEOUT_MS",
				30_000,
			),
			connectionTimeoutMillis: getInteger(
				configService,
				"DATABASE_CONNECTION_TIMEOUT_MS",
				5_000,
			),
		});

		return {
			pool,
			db: drizzle(pool, { schema }),
			onApplicationShutdown: () => pool.end(),
		};
	},
};
