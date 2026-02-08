import axios from 'axios';
import jwt from 'jsonwebtoken';
import { google, sheets_v4 } from 'googleapis';
import { UserPayload } from '../../core/types/userpayload.types';
import { decrypt, encrypt } from '../../core/utils/crypto';

// ==================== Types ====================

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

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

interface RefreshTokenPayload {
    googleId: string;
    ssid?: string;  // spreadsheetId
    grt?: string;   // encrypted Google refresh token
}

interface GoogleCredentials {
    googleRefreshToken?: string;
    spreadsheetId?: string;
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

const JWT_ACCESS_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';




// ==================== Google OAuth Service ====================

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const response = await axios.post<GoogleTokenResponse>(GOOGLE_TOKEN_URL, {
        code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
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

// ==================== Google Sheets Service ====================

export function createSheetsClient(accessToken: string): sheets_v4.Sheets {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.sheets({ version: 'v4', auth });
}

export async function createUserSpreadsheet(
    accessToken: string,
    title: string = 'My App Data'
): Promise<string | undefined> {
    try {
        const sheets = createSheetsClient(accessToken);
        const spreadsheet = await sheets.spreadsheets.create({
            requestBody: {
                properties: { title }
            }
        });

        const spreadsheetId = spreadsheet.data.spreadsheetId ?? undefined;
        console.log('Created spreadsheet:', spreadsheetId);
        return spreadsheetId;
    } catch (error) {
        console.error('Failed to create spreadsheet:', error);
        return undefined;
    }
}

// ==================== JWT Service ====================

export function generateAuthTokens(
    userData: UserPayload,
    googleRefreshToken?: string,
    spreadsheetId?: string
): AuthTokens {
    const accessToken = jwt.sign(
        userData,
        process.env.JWT_SECRET as string,
        { expiresIn: JWT_ACCESS_EXPIRES_IN }
    );

    const refreshPayload: RefreshTokenPayload = {
        googleId: userData.googleId
    };

    if (spreadsheetId) {
        refreshPayload.ssid = spreadsheetId;
    }

    if (googleRefreshToken) {
        refreshPayload.grt = encrypt(googleRefreshToken);
    }

    const refreshToken = jwt.sign(
        refreshPayload,
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    return { accessToken, refreshToken };
}

export function generateAccessToken(googleId: string): string {
    return jwt.sign(
        { googleId },
        process.env.JWT_SECRET as string,
        { expiresIn: JWT_ACCESS_EXPIRES_IN }
    );
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as RefreshTokenPayload;
}

export function extractGoogleCredentials(refreshPayload: RefreshTokenPayload): GoogleCredentials {
    return {
        googleRefreshToken: refreshPayload.grt ? decrypt(refreshPayload.grt) : undefined,
        spreadsheetId: refreshPayload.ssid
    };
}
