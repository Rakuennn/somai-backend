import express, { NextFunction, Request, Response } from 'express';
import { BaseResponse } from '../../core/types/base.response';
import { sendSuccess, sendSuccessNoData } from '../../core/utils/response.helper';
import { authenticate } from '../../middlewares/auth.middleware';
import { googleAuth } from '../../middlewares/google.auth.middleware';
import { ContentsRequest, RefineContentsRequest, SubmitContentsRequest } from './content.request';
import { ContentItem, ContentsResponse, CreateContentResponse, N8nRefineResponse, N8nResponse, SpreadsheetHistoryResponse } from './content.response';
import { ContentException } from './exception';
import axios from 'axios';
import { Platform } from '../../core/types/platform.enum';
import { appendToSpreadsheet, getSpreadsheetData, pollForResult } from './content.service';
import { publishFacebookPhoto, publishToFacebookPage } from '../../core/utils/facebook.utils';
import { publishToInstagram } from '../../core/utils/instagram.utils';
import { FacebookTokenRepository } from '../../data/repositories/facebook.token.repository';
import { upload } from '../../middlewares/upload.middleware';
import fs from 'fs';
import path from 'path';


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

        try {
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

            console.log("contentResponse:", JSON.stringify(contentResponse.data, null, 2));
            if (contentResponse.data.status !== 'success') {
                return res.status(200).json({
                    success: false,
                    message: contentResponse.data.message,
                });
            }
            
            console.log("job_id:", contentResponse.data.job_id);
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
        const { content } = req.body;
        const image = req.file ? req.file.buffer : req.body.image;

        const rawPlatform = req.body.platform;
        const platform: string = typeof rawPlatform === 'object' && rawPlatform !== null
            ? (rawPlatform as any).value ?? String(rawPlatform)
            : String(rawPlatform);

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
                const igUser = req.user;
                if (!igUser) {
                    return next(ContentException.unauthorized());
                }

                const facebookDataForIg = await FacebookTokenRepository.getToken(igUser.googleId);

                if (!facebookDataForIg || !facebookDataForIg.pages || facebookDataForIg.pages.length === 0) {
                    return next(ContentException.platformNotConnected('Instagram'));
                }

                const pageForIg = facebookDataForIg.pages[0];

                if (!pageForIg.instagramAccountId) {
                    return next(ContentException.platformNotConnected('Instagram'));
                }

                if (!image) {
                    return next(ContentException.invalidImage());
                }

                let finalImageUrl: string;
                if (Buffer.isBuffer(image)) {
                    const uploadDir = path.join(process.cwd(), 'uploads');
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    const filename = `ig_${Date.now()}.jpg`;
                    fs.writeFileSync(path.join(uploadDir, filename), image);
                    finalImageUrl = `${process.env.NGROK_DOMAIN}/uploads/${filename}`;
                } else if (typeof image === 'string') {
                    finalImageUrl = image;
                } else {
                    return next(ContentException.invalidImage());
                }

                const igResponse = await publishToInstagram({
                    igUserId: pageForIg.instagramAccountId,
                    pageAccessToken: pageForIg.accessToken,
                    caption: content,
                    imageUrl: finalImageUrl,
                });

                if (igResponse.url) {
                    link = igResponse.url;
                }
                break;
        }

        if (!spreadsheetId) {
            return next(ContentException.spreadsheetSaveFailed());
        }

        const success = await appendToSpreadsheet(accessToken, spreadsheetId, {
            platform: platform,
            timestamp: new Date().toISOString(),
            link
        });

        if (!success) {
            return next(ContentException.spreadsheetSaveFailed());
        }
        sendSuccess(res, 'Content submitted successfully');

    });


/**
 * @swagger
 * /contents/history:
 *   get:
 *     summary: Get contents history from Google Sheet
 *     description: Retrieve all submitted content records saved in the user's Google Sheet
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History retrieved.
 *       401:
 *         description: Unauthorized
 */
router.get('/contents/history',
    authenticate,
    googleAuth,
    async (req: Request, res: Response<BaseResponse<SpreadsheetHistoryResponse>>, next: NextFunction) => {
        const { accessToken, spreadsheetId } = req.google;

        if (!spreadsheetId) {
            return next(ContentException.spreadsheetSaveFailed());
        }

        try {
            const rows = await getSpreadsheetData(accessToken, spreadsheetId);
            sendSuccess(res, { rows }, 'History retrieved');
        } catch (error) {
            return next(error);
        }
    });

export default router;