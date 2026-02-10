import express, { Request, Response, NextFunction } from 'express';
import { cleanupExpiredStates, oauthStates } from '../../../core/utils/cleanup.expired.state';
import crypto from 'crypto';
import { BaseResponse } from '../../../core/types/base.response';
import { FacebookLoginResponse } from './facebook.response';
import AuthException from '../exception';
import { exchangeFacebookCodeForToken } from './facebook.auth.service';
import { sendSuccess } from '../../../core/utils/response.helper';
const router = express.Router();

const FacebookAuthUrl = 'https://www.facebook.com/v24.0/dialog/oauth';

router.get('/auth/facebook', (req, res) => {
    cleanupExpiredStates();

    const state = crypto.randomBytes(32).toString('hex');
    oauthStates.set(state, { createdAt: Date.now() });
    console.log('Facebook stored state:', state);

    const params = new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID as string,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI as string,
        response_type: 'code',
        scope: 'public_profile',
        state,
    });

    res.redirect(`${FacebookAuthUrl}?${params}`);
});

router.get('/auth/facebook/callback',
    async (
        req: Request,
        res: Response<BaseResponse<FacebookLoginResponse>>,
        next: NextFunction
    ) => {
        const { state, code } = req.query as { state: string; code: string };

        console.log('=== Facebook OAuth Callback Debug ===');
        console.log('URL state:', state);
        console.log('State exists in Map:', oauthStates.has(state));
        console.log('=====================================');

        if (!oauthStates.has(state)) {
            return next(AuthException.forbidden());
        }

        oauthStates.delete(state);

        try {
            const { access_token } = await exchangeFacebookCodeForToken(code);

            sendSuccess(res, {
                accessToken: access_token
            }, 'Facebook login successful');

        } catch (error) {
            next(error);
        }
    });