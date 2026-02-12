import redisClient from '../redis.client';
import { FacebookTokenData } from '../models/facebook_token.model';

export class FacebookTokenRepository {
    private static readonly KEY_PREFIX = 'user:facebook:';
    private static readonly DEFAULT_TTL = 60 * 60 * 24 * 60; // 60 days

    static async saveToken(userId: string, data: FacebookTokenData, ttlSeconds: number = FacebookTokenRepository.DEFAULT_TTL): Promise<void> {
        const key = this.getKey(userId);
        await redisClient.set(key, JSON.stringify(data), {
            EX: ttlSeconds
        });
    }

    static async getToken(userId: string): Promise<FacebookTokenData | null> {
        const key = this.getKey(userId);
        const data = await redisClient.get(key);
        if (!data) return null;
        return JSON.parse(data) as FacebookTokenData;
    }

    static async deleteToken(userId: string): Promise<void> {
        const key = this.getKey(userId);
        await redisClient.del(key);
    }

    private static getKey(userId: string): string {
        return `${this.KEY_PREFIX}${userId}`;
    }
}
