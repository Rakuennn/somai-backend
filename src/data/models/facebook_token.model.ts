export interface FacebookPageData {
    id: string;
    name?: string;
    accessToken: string;
}

export interface FacebookTokenData {
    userId: string;
    userAccessToken: string;
    expiresAt?: number;
    pages: FacebookPageData[];
}
