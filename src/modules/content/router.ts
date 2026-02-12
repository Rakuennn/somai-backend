import express, { NextFunction, Request, Response } from 'express';
import { BaseResponse } from '../../core/types/base.response';
import { sendSuccess, sendSuccessNoData } from '../../core/utils/response.helper';
import { authenticate } from '../../middlewares/auth.middleware';
import { googleAuth } from '../../middlewares/google.auth.middleware';
import { ContentsRequest, RefineContentsRequest, SubmitContentsRequest } from './content.request';
import { ContentItem, ContentsResponse, CreateContentResponse, N8nRefineResponse, N8nResponse } from './content.response';
import { ContentException } from './exception';
import axios from 'axios';
import { Platform } from '../../core/types/platform.enum';
import { appendToSpreadsheet, pollForResult } from './content.service';
import { publishFacebookPhoto, publishToFacebookPage } from '../../core/utils/facebook.utils';
import { FacebookTokenRepository } from '../../data/repositories/facebook.token.repository';
import { upload } from '../../middlewares/upload.middleware';


const router = express.Router();
/**
 * @swagger
 * /contents:
 *   post:
 *     summary: Create contents
 *     description: Create contents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brief:
 *                 type: string
 *               platforms:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Contents created.
 *       401:
 *         description: Unauthorized
 */

router.post('/contents',
    authenticate,
    async (req: Request<{}, {}, ContentsRequest>, res: Response<BaseResponse<ContentsResponse>>, next: NextFunction) => {
        const { brief, platforms } = req.body;

        const url = process.env.SOMA_N8N_URL;
        if (!url) {
            return next(ContentException.n8nFailed());
        }
        const contentResponse = await axios.post<CreateContentResponse>(`${url}/webhook/SOMAi/create-content`, {
            user_brief: brief,
            platforms: platforms,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SOMA_N8N_TOKEN}`,
            }
        });

        if (contentResponse.data.status !== 'success') {
            return next(ContentException.n8nFailedWithMessage(contentResponse.data.message));
        }

        console.log("job_id:", contentResponse.data.job_id);
        try {
            const result: N8nResponse = await pollForResult(contentResponse.data.job_id);
            const contents: ContentItem[] = result.generated_content.map((item) => ({
                platform: item.json.platform as Platform,
                content: item.json.content.parts[0].text,
            }));

            sendSuccess(res, { contents }, 'Contents created');
        } catch (error) {
            return next(error);
        }
    });

/**
 * @swagger
 * /contents/refine:
 *   post:
 *     summary: Refine contents
 *     description: Refine contents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               feedback:
 *                 type: string
 *               platform:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contents refined.
 *       401:
 *         description: Unauthorized
 */

router.post('/contents/refine',
    authenticate,
    async (req: Request<{}, {}, RefineContentsRequest>, res: Response<BaseResponse<ContentItem>>, next: NextFunction) => {
        const { content, feedback, platform } = req.body;

        const url = process.env.SOMA_N8N_URL;
        if (!url) {
            return next(ContentException.n8nFailed());
        }
        const response = await axios.post<N8nRefineResponse>(`${url}/webhook/SOMAi/regen-content`, {
            platforms: platform,
            comment: feedback,
            old_content: content,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SOMA_N8N_TOKEN}`,
            }
        });

        console.log("refine response:", JSON.stringify(response.data, null, 2));

        sendSuccess(res, {
            platform: platform,
            content: response.data.result,
        }, 'Contents refined');
    });

/**
 * @swagger
 * /contents/submit:
 *   post:
 *     summary: Submit contents
 *     description: Submit contents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               platform:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               platform:
 *                 type: string
 *               image:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contents submitted.
 *       401:
 *         description: Unauthorized
 */

router.post('/contents/submit',
    authenticate,
    googleAuth,
    upload.single('image'),

    async (req: Request<{}, {}, SubmitContentsRequest>, res: Response<BaseResponse>, next: NextFunction) => {
        const { content, platform } = req.body;
        const image = req.file ? req.file.buffer : req.body.image;

        const { accessToken, spreadsheetId } = req.google;
        let link = '';

        switch (platform) {
            case Platform.Facebook:
                const user = req.user;
                if (!user) {
                    return next(ContentException.unauthorized());
                }

                const facebookData = await FacebookTokenRepository.getToken(user.googleId);

                if (!facebookData || !facebookData.pages || facebookData.pages.length === 0) {
                    return next(ContentException.platformNotConnected('Facebook'));
                }

                const pageToPost = facebookData.pages[0];
                let facebookResponse;
                if (image) {
                    facebookResponse = await publishFacebookPhoto({
                        pageId: pageToPost.id,
                        pageAccessToken: pageToPost.accessToken,
                        message: content,
                        image
                    });
                } else {
                    facebookResponse = await publishToFacebookPage({
                        pageId: pageToPost.id,
                        pageAccessToken: pageToPost.accessToken,
                        message: content,
                    });
                }

                if (facebookResponse.url) {
                    link = facebookResponse.url;
                }
                break;
            case Platform.TikTok:
                break;
            case Platform.Instagram:
                break;
        }

        if (!spreadsheetId) {
            return next(ContentException.spreadsheetSaveFailed());
        }

        const success = await appendToSpreadsheet(accessToken, spreadsheetId, {
            platform,
            timestamp: new Date().toISOString(),
            link
        });

        if (!success) {
            return next(ContentException.spreadsheetSaveFailed());
        }
        sendSuccess(res, 'Content submitted successfully');

    });


export default router;