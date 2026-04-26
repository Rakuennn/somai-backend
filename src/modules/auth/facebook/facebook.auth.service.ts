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
    console.log('[FB Service] userAccessToken:', userAccessToken);

    const me = await axios.get("https://graph.facebook.com/me", {
        params: { access_token: userAccessToken }
    });
    const userId = me.data.id;
    console.log('[FB Service] me response:', JSON.stringify(me.data, null, 2));

    const pagesRes = await axios.get(
        `https://graph.facebook.com/${userId}/accounts`,
        {
            params: { access_token: userAccessToken }
        }
    );
    console.log('[FB Service] /accounts response:', JSON.stringify(pagesRes.data, null, 2));

    const pagesWithIg = await Promise.all(
        pagesRes.data.data.map(async (page: any) => {
            let instagram_account_id: string | undefined;
            try {
                const igRes = await axios.get(`${FACEBOOK_GRAPH_URL}/${page.id}`, {
                    params: {
                        fields: 'instagram_business_account',
                        access_token: page.access_token,
                    }
                });
                instagram_account_id = igRes.data.instagram_business_account?.id;
                console.log(`[FB Service] IG lookup for page ${page.id}:`, JSON.stringify(igRes.data, null, 2));
            } catch (err: any) {
                console.warn(`[FB Service] Could not fetch Instagram account for page ${page.id}:`, err?.response?.data ?? err);
            }
            return {
                id: page.id,
                access_token: page.access_token,
                instagram_account_id,
            };
        })
    );

    return {
        user_id: userId,
        user_access_token: userAccessToken,
        pages: pagesWithIg,
    };
}
