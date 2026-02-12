import express, { Request, Response, NextFunction } from 'express';
import { FacebookTokenRepository } from '../../../data/repositories/facebook.token.repository';
import { cleanupExpiredStates, oauthStates } from '../../../core/utils/cleanup.expired.state';
import crypto from 'crypto';
import { BaseResponse } from '../../../core/types/base.response';
import AuthException from '../exception';
import { exchangeFacebookCodeForToken } from './facebook.auth.service';
import { sendSuccessNoData } from '../../../core/utils/response.helper';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../../../core/types/userpayload.types';
const router = express.Router();

router.get('/auth/facebook', (req, res, next) => {
    cleanupExpiredStates();

    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token && req.query.token) {
        token = req.query.token as string;
    }

    if (!token) {
        return res.status(401).json({ message: 'Token required (Header or ?token=...)' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
        req.user = {
            googleId: decoded.googleId,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture
        };
    } catch (error) {
        return res.status(401).json({ message: 'Invalid Token' });
    }

    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const state = crypto.randomBytes(32).toString('hex');
    oauthStates.set(state, {
        createdAt: Date.now(),
        googleId: req.user.googleId
    });

    const scope = [
        "pages_show_list",
        "pages_manage_posts",
        "pages_read_engagement"
    ].join(",")

    const FacebookAuthUrl = 'https://www.facebook.com/v24.0/dialog/oauth';

    const params = new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID as string,
        redirect_uri: process.env.NGROK_DOMAIN + '/auth/facebook/callback' as string,
        response_type: 'code',
        scope,
        state,
    });

    res.redirect(`${FacebookAuthUrl}?${params}`);
});

router.get('/auth/facebook/callback',
    async (
        req: Request,
        res: Response<BaseResponse>,
        next: NextFunction
    ) => {
        const { state, code } = req.query as { state: string; code: string };

        const savedState = oauthStates.get(state);

        if (!savedState) {
            return next(AuthException.forbidden());
        }

        oauthStates.delete(state);

        try {
            const { user_id, user_access_token, pages } = await exchangeFacebookCodeForToken(code);

            if (!savedState.googleId) {
                return next(AuthException.forbidden());
            }

            await FacebookTokenRepository.saveToken(savedState.googleId, {
                userId: user_id,
                userAccessToken: user_access_token,
                pages: pages.map(p => ({
                    id: p.id,
                    accessToken: p.access_token,
                })),
                expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000
            });

            sendSuccessNoData(res, 'Facebook login successful');

        } catch (error) {
            console.error('Facebook callback error:', error);
            return next(AuthException.facebookAuthFailed());
        }
    });

export default router;