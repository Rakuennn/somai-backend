import { refreshGoogleAccessToken } from '../../modules/auth/google/google.auth.service';
import redisClient from '../redis.client';
import { UserTokenData } from '../models/user_token.model';

export class GoogleTokenRepository {
    private static readonly KEY_PREFIX = 'user:token:';
    private static readonly DEFAULT_TTL = 60 * 60 * 24 * 7;

    static async saveTokens(googleId: string, data: UserTokenData, ttlSeconds: number = GoogleTokenRepository.DEFAULT_TTL): Promise<void> {
        const key = this.getKey(googleId);
        await redisClient.set(key, JSON.stringify(data), {
            EX: ttlSeconds
        });
    }

    static async getTokens(googleId: string): Promise<UserTokenData | null> {
        const key = this.getKey(googleId);
        const data = await redisClient.get(key);
        if (!data) return null;

        const tokenData = JSON.parse(data) as UserTokenData;

        if (tokenData.expiresAt && Date.now() > tokenData.expiresAt - 300000) {
            try {
                const newAccessToken = await refreshGoogleAccessToken(tokenData.refreshToken);
                tokenData.accessToken = newAccessToken;
                tokenData.expiresAt = Date.now() + 3500 * 1000; // Extend expiry (approx 1 hour)
                await this.saveTokens(googleId, tokenData);
                return tokenData;
            } catch (error) {
                console.error('Failed to refresh Google token:', error);
                return null;
            }
        }

        return tokenData;
    }

    static async deleteTokens(googleId: string): Promise<void> {
        const key = this.getKey(googleId);
        await redisClient.del(key);
    }

    private static getKey(googleId: string): string {
        return `${this.KEY_PREFIX}${googleId}`;
    }
}
