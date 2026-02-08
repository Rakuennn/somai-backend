import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthException } from './auth.exception';
import { UserPayload } from '../core/types/userpayload.types';

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(AuthException.tokenRequired());
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;

        req.user = {
            googleId: decoded.googleId,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture
        };

        next();
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'TokenExpiredError') {
            return next(AuthException.tokenExpired());
        }
        return next(AuthException.invalidToken());
    }
};

export default { authenticate };