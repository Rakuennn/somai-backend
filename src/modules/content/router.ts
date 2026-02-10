import express, { NextFunction, Request, Response } from 'express';
import { BaseResponse } from '../../core/types/base.response';
import { sendSuccess, sendSuccessNoData } from '../../core/utils/response.helper';
import { authenticate } from '../../middlewares/auth.middleware';
import { googleAuth } from '../../middlewares/google.auth.middleware';
import { ContentsRequest, RefineContentsRequest, SubmitContentsRequest } from './content.request';
import { ContentsResponse, N8nResponse } from './content.response';
import { ContentException } from './exception';
import axios from 'axios';
import { Platform } from '../../core/types/platform.enum';
import { appendToSpreadsheet } from './content.service';


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
    async (req: Request<{}, {}, ContentsRequest>, res: Response<BaseResponse<ContentsResponse>>) => {
        const { brief, platforms } = req.body;

        const url = process.env.SOMA_N8N_URL;
        if (!url) {
            throw new Error('SOMA_N8N_URL is not defined');
        }
        const response = await axios.post(url, {
            user_brief: brief,
            platformIds: platforms,
            temp: "https://5shwv7n9-5000.asse.devtunnels.ms/api/test_gen_content"
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SOMA_N8N_TOKEN}`,
            }
        });

        const n8nData = response.data as N8nResponse;

        const contents = n8nData.generated_content.map((item, index) => ({
            id: String(index + 1),
            platform: item.json.platform as Platform,
            brief: brief,
            content: item.json.content.parts[0].text
        }));

        sendSuccess(res, { contents }, 'Contents created');
    });

/**
 * @swagger
 * /contents/{platformId}/refine:
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
    (req: Request<{}, {}, RefineContentsRequest>, res: Response<BaseResponse<ContentsResponse>>) => {
        const { content, feedback, platform } = req.body;

        // Todo: Implement refine contents
    });


router.post('/contents/submit',
    authenticate,
    googleAuth,
    async (req: Request<{}, {}, SubmitContentsRequest>, res: Response<BaseResponse>, next: NextFunction) => {
        try {
            const { content, platform, link } = req.body;
            const { accessToken, spreadsheetId } = req.google!;

            const success = await appendToSpreadsheet(accessToken, spreadsheetId, {
                platform,
                timestamp: new Date().toISOString(),
                link,
                content
            });

            if (!success) {
                return next(ContentException.spreadsheetSaveFailed());
            }

            sendSuccessNoData(res, 'Content submitted successfully');
        } catch (error) {
            next(error);
        }
    });


export default router;