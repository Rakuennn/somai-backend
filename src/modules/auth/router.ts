import express, { Request, Response, NextFunction } from 'express';

import { AuthException } from './exception';
import { BaseResponse } from '../../core/types/base.response';
import { RefreshData } from './auth.response';
import { RefreshRequest } from './auth.request';
import { sendSuccess, sendSuccessNoData } from '../../core/utils/response.helper';
import { generateAccessToken, verifyRefreshToken } from './auth.service';

const router = express.Router();

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

router.post('/logout', (req: Request, res: Response<BaseResponse>) => {
    req.session.destroy(() => {
        sendSuccessNoData(res, 'Logout successful');
    });
});


export default router;