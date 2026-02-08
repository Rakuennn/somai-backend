import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

import { AuthException } from './exception';
import { BaseResponse } from '../../core/types/base.response';
import { LoginData, RefreshData } from './auth.response';
import { RefreshRequest } from './auth.request';
import { sendSuccess, sendSuccessNoData } from '../../core/utils/response.helper';
import {
    exchangeCodeForTokens,
    fetchGoogleUserInfo,
    mapToUserPayload,
    createUserSpreadsheet,
    generateAuthTokens,
    generateAccessToken,
    verifyRefreshToken
} from './auth.service';


declare module 'express-session' {
    interface SessionData {
        oauthState?: string;
    }
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_SCOPES = [
    'openid',
    'profile',
    'email',
    'https://www.googleapis.com/auth/spreadsheets'
];

const oauthStates = new Map<string, { createdAt: number }>();
function cleanupExpiredStates() {
    const now = Date.now();
    for (const [state, data] of oauthStates) {
        if (now - data.createdAt > 10 * 60 * 1000) {
            oauthStates.delete(state);
        }
    }
}

const router = express.Router();

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

router.post('/logout', (req: Request, res: Response<BaseResponse>) => {
    req.session.destroy(() => {
        sendSuccessNoData(res, 'Logout successful');
    });
});

router.get('/auth/google/callback', async (
    req: Request,
    res: Response<BaseResponse<LoginData>>,
    next: NextFunction
) => {
    const { state, code } = req.query as { state: string; code: string };

    console.log('=== OAuth Callback Debug ===');
    console.log('URL state:', state);
    console.log('State exists in Map:', oauthStates.has(state));
    console.log('============================');

    if (!oauthStates.has(state)) {
        return next(AuthException.forbidden());
    }

    oauthStates.delete(state);

    try {
        const { access_token, refresh_token } = await exchangeCodeForTokens(code);
        const spreadsheetId = await createUserSpreadsheet(access_token);

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

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Access token refreshed.
 */
router.post('/auth/refresh', (
    req: Request<RefreshRequest>,
    res: Response<BaseResponse<RefreshData>>,
    next: NextFunction
) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return next(AuthException.tokenRequired());
    }

    try {
        const { googleId } = verifyRefreshToken(refreshToken);
        const accessToken = generateAccessToken(googleId);

        sendSuccess(res, { accessToken }, 'Refresh successful');

    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'TokenExpiredError') {
            return next(AuthException.tokenExpired());
        }
        return next(AuthException.invalidToken());
    }
});

export default router;