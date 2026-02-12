import axios from "axios";
import { FacebookTokenResponse } from './facebook.response';

const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v24.0';

export async function exchangeFacebookCodeForToken(code: string): Promise<FacebookTokenResponse> {
    const params = new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID as string,
        redirect_uri: process.env.NGROK_DOMAIN + '/auth/facebook/callback' as string,
        client_secret: process.env.FACEBOOK_APP_SECRET as string,
        code
    });

    let tokenRes;
    try {
        tokenRes = await axios.get<{ access_token: string }>(
            `${FACEBOOK_GRAPH_URL}/oauth/access_token?${params}`
        );
    } catch (err: any) {
        console.error('Facebook token exchange error:', err.response?.data);
        throw err;
    }
    const userAccessToken = tokenRes.data.access_token;
    const me = await axios.get("https://graph.facebook.com/me", {
        params: { access_token: userAccessToken }
    });
    const userId = me.data.id;

    const pages = await axios.get(
        `https://graph.facebook.com/${userId}/accounts`,
        {
            params: { access_token: userAccessToken }
        }
    );

    return {
        user_id: userId,
        user_access_token: userAccessToken,
        pages: pages.data.data.map((page: any) => ({
            id: page.id,
            access_token: page.access_token
        }))
    };
}
