export const oauthStates = new Map<string, { createdAt: number }>();

export function cleanupExpiredStates() {
    const now = Date.now();
    for (const [state, data] of oauthStates) {
        if (now - data.createdAt > 10 * 60 * 1000) {
            oauthStates.delete(state);
        }
    }
}