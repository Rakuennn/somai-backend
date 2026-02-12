import axios from "axios";
import { createUserSpreadsheet, findExistingSpreadsheet } from "../../../core/utils/spreadsheet.helper";
import { UserPayload } from "../../../core/types/userpayload.types";

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

interface GoogleTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
}

interface GoogleUserInfo {
    sub: string;
    email: string;
    name: string;
    picture: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const response = await axios.post<GoogleTokenResponse>(GOOGLE_TOKEN_URL, {
        code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: process.env.NGROK_DOMAIN + '/auth/google/callback',
        grant_type: 'authorization_code'
    });
    return response.data;
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
    const response = await axios.post<{ access_token: string }>(GOOGLE_TOKEN_URL, {
        refresh_token: refreshToken,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'refresh_token'
    });
    return response.data.access_token;
}



export async function getOrCreateUserSpreadsheet(
    accessToken: string,
    title: string = 'Somai History'
): Promise<string> {
    const existingId = await findExistingSpreadsheet(accessToken, title);
    if (existingId) {
        return existingId;
    }

    return await createUserSpreadsheet(accessToken, title);
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await axios.get<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
}

export function mapToUserPayload(googleUser: GoogleUserInfo): UserPayload {
    return {
        googleId: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture
    };
}
