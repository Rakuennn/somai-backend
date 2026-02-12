import { Request, Response, NextFunction } from 'express';
import AuthException from './auth.exception';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../core/types/userpayload.types';
import { GoogleTokenRepository } from '../data/repositories/google.token.repository';

declare global {
    namespace Express {
        interface Request {
            google: {
                accessToken: string;
                spreadsheetId: string;
            };
        }
    }
}

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(AuthException.tokenRequired());
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
        const cachedTokenData = await GoogleTokenRepository.getTokens(decoded.googleId);

        if (cachedTokenData) {
            req.google = {
                accessToken: cachedTokenData.accessToken,
                spreadsheetId: cachedTokenData.spreadsheetId
            };
            return next();
        }

        return next(AuthException.googleCredentialsNotFound());

    } catch (error) {
        next(error);
    }
};
