export interface FacebookTokenResponse {
    user_id: string;
    user_access_token: string;
    pages: {
        id: string;
        access_token: string;
        instagram_account_id?: string;
    }[]
}