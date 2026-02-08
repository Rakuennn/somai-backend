import express, { Request, Response } from 'express';
import { BaseResponse } from '../../core/types/base.response';
import { sendSuccess } from '../../core/utils/response.helper';
import { authenticate } from '../../middlewares/auth.middleware';
import { ContentsRequest, RefineContentsRequest, SubmitContentsRequest } from './content.request';
import { ContentsResponse, N8nResponse } from './content.response';
import axios from 'axios';

const router = express.Router();
/**
 * @swagger
 * /contents:
 *   post:
 *     summary: Create contents
 *     description: Create contents
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
 */

router.post('/contents',
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
            platformId: item.json.platform,
            brief: brief,
            content: item.json.content.parts[0].text
        }));

        sendSuccess(res, { contents }, 'Contents created');
    });

router.post('/contents/:platformId/refine',
    authenticate,
    (req: Request<{ platformId: string }, {}, RefineContentsRequest>, res: Response<BaseResponse<ContentsResponse>>) => {
        const { brief, content, feedback } = req.body;

        // Todo: Implement refine contents
    });

router.post('/contents/:platformId/submit',
    authenticate,
    (req: Request<{ platformId: string }, {}, SubmitContentsRequest>, res: Response<BaseResponse<ContentsResponse>>) => {
        const { content } = req.body;

        // Todo: Implement submit contents
    });

export default router;