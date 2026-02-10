import { Request, Response, NextFunction } from 'express';
import { verifyRefreshToken, extractGoogleCredentials } from '../modules/auth/auth.service';
import { refreshGoogleAccessToken } from '../modules/auth/google/google.auth.service';
import AuthException from './auth.exception';

declare global {
    namespace Express {
        interface Request {
            google?: {
                accessToken: string;
                spreadsheetId: string;
            };
        }
    }
}

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshTokenHeader = req.headers['x-refresh-token'] as string;

        if (!refreshTokenHeader) {
            return next(AuthException.refreshTokenRequired());
        }

        const refreshPayload = verifyRefreshToken(refreshTokenHeader);
        const { googleRefreshToken, spreadsheetId } = extractGoogleCredentials(refreshPayload);

        if (!googleRefreshToken || !spreadsheetId) {
            return next(AuthException.googleCredentialsNotFound());
        }

        const accessToken = await refreshGoogleAccessToken(googleRefreshToken);

        req.google = { accessToken, spreadsheetId };
        next();
    } catch (error) {
        next(error);
    }
};
