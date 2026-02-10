import express, { Request, Response, NextFunction } from 'express';
import { cleanupExpiredStates, oauthStates } from '../../../core/utils/cleanup.expired.state';
import crypto from 'crypto';
import { BaseResponse } from '../../../core/types/base.response';
import AuthException from '../exception';
import { exchangeCodeForTokens, fetchGoogleUserInfo, getOrCreateUserSpreadsheet, mapToUserPayload } from './google.auth.service';
import { generateAuthTokens } from '../auth.service';
import { sendSuccess } from '../../../core/utils/response.helper';
import { GoogleLoginResponse } from './google.response';

const router = express.Router();
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_SCOPES = [
    'openid',
    'profile',
    'email',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly'
];


router.get('/login/google', (req: Request, res: Response) => {
    cleanupExpiredStates();

    const state = crypto.randomBytes(32).toString('hex');
    oauthStates.set(state, { createdAt: Date.now() });
    console.log('Stored state:', state);

    const params = new URLSearchParams({
        client_id: process.env.CLIENT_ID as string,
        redirect_uri: process.env.REDIRECT_URI as string,
        response_type: 'code',
        scope: OAUTH_SCOPES.join(' '),
        state,
        access_type: 'offline',
        prompt: 'consent'
    });

    res.redirect(`${GOOGLE_AUTH_URL}?${params}`);
});

router.get('/auth/google/callback', async (
    req: Request,
    res: Response<BaseResponse<GoogleLoginResponse>>,
    next: NextFunction
) => {
    const { state, code } = req.query as { state: string; code: string };

    if (!oauthStates.has(state)) {
        return next(AuthException.forbidden());
    }

    oauthStates.delete(state);

    try {
        const { access_token, refresh_token } = await exchangeCodeForTokens(code);
        const spreadsheetId = await getOrCreateUserSpreadsheet(access_token);

        const googleUserInfo = await fetchGoogleUserInfo(access_token);
        const userData = mapToUserPayload(googleUserInfo);

        const { accessToken, refreshToken } = generateAuthTokens(
            userData,
            refresh_token,
            spreadsheetId
        );

        sendSuccess(res, {
            accessToken,
            refreshToken,
            user: userData
        }, 'Login successful');

    } catch (error) {
        next(error);
    }
});