import { Injectable, UnauthorizedException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { refresh_token } from '../database/schema/refreshToken.schema';
import { user_profile } from '../database/schema/user_profile.schema';

export interface RefreshUser {
	id: string;
	fullname: string;
	tenent_id: string;
	isActive: boolean | null;
}

@Injectable()
export class RefreshService {
	constructor(private readonly databaseService: DatabaseService) {}

	async findUserByToken(token: string): Promise<RefreshUser> {
		const tokenHash = hashRefreshToken(token);
		const [user] = await this.databaseService.db.transaction(async (transaction) => {
			await transaction.execute(
				sql`select set_config('app.refresh_token_hash', ${tokenHash}, true)`,
			);

			return transaction
				.select({
					id: user_profile.id,
					fullname: user_profile.fullname,
					tenent_id: user_profile.tenent_id,
					isActive: user_profile.is_active,
				})
				.from(refresh_token)
				.innerJoin(user_profile, eq(refresh_token.user_id, user_profile.id))
				.where(eq(refresh_token.token_hash, tokenHash))
				.limit(1);
		});

		if (!user || !user.isActive) {
			throw new UnauthorizedException('Invalid or expired refresh token.');
		}

		return user;
	}

	async rotate(userId: string): Promise<string> {
		const refreshToken = randomBytes(48).toString('base64url');
		const refreshTokenHash = hashRefreshToken(refreshToken);
		const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

		await this.databaseService.db.transaction(async (transaction) => {
			await transaction.execute(
				sql`select set_config('app.create_refresh_token', 'true', true)`,
			);
			await transaction.execute(
				sql`select set_config('app.rotate_refresh_token', 'true', true)`,
			);
			await transaction.delete(refresh_token).where(eq(refresh_token.user_id, userId));
			await transaction.insert(refresh_token).values({
				user_id: userId,
				token_hash: refreshTokenHash,
				expires_at: refreshTokenExpiresAt,
			});
		});

		return refreshToken;
	}
}

function hashRefreshToken(token: string): string {
	return createHash('sha256').update(token).digest('base64');
}
