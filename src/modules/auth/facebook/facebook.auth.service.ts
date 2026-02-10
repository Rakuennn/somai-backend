import axios from "axios";

interface FacebookTokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
}

const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v24.0';

export async function exchangeFacebookCodeForToken(code: string): Promise<FacebookTokenResponse> {
    const params = new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID as string,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI as string,
        client_secret: process.env.FACEBOOK_APP_SECRET as string,
        code
    });

    const response = await axios.get<FacebookTokenResponse>(
        `${FACEBOOK_GRAPH_URL}/oauth/access_token?${params}`
    );
    return response.data;
}
