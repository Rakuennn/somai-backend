import jwt from 'jsonwebtoken';
import { UserPayload } from '../../core/types/userpayload.types';
import { decrypt, encrypt } from '../../core/utils/crypto';

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

interface RefreshTokenPayload {
    googleId: string;
    ssid?: string;
    grt?: string;
}

interface GoogleCredentials {
    googleRefreshToken?: string;
    spreadsheetId?: string;
}

const JWT_ACCESS_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';


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
