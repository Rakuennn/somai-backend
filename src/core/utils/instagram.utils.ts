import axios from 'axios';

const INSTAGRAM_GRAPH_URL = 'https://graph.facebook.com/v24.0';

interface InstagramPostParams {
    igUserId: string;
    pageAccessToken: string;
    caption: string;
    imageUrl: string;
}

interface InstagramPostResponse {
    id: string;
    url?: string;
}

/**
 * Publishes a photo to Instagram via the Instagram Graph API.
 * Instagram requires a 2-step process:
 *   1. Create a media container (upload metadata + image URL)
 *   2. Publish the container
 *
 * NOTE: imageUrl must be a publicly accessible URL (not a Buffer).
 */
export async function publishToInstagram({
    igUserId,
    pageAccessToken,
    caption,
    imageUrl,
}: InstagramPostParams): Promise<InstagramPostResponse> {

    // Step 1: Create media container
    const containerRes = await axios.post<{ id: string }>(
        `${INSTAGRAM_GRAPH_URL}/${igUserId}/media`,
        null,
        {
            params: {
                image_url: imageUrl,
                caption,
                access_token: pageAccessToken,
            }
        }
    );

    const creationId = containerRes.data.id;

    // Step 2: Publish the container
    const publishRes = await axios.post<{ id: string }>(
        `${INSTAGRAM_GRAPH_URL}/${igUserId}/media_publish`,
        null,
        {
            params: {
                creation_id: creationId,
                access_token: pageAccessToken,
            }
        }
    );

    const mediaId = publishRes.data.id;
    const url = await getInstagramPostUrl(mediaId, pageAccessToken);

    return {
        id: mediaId,
        url,
    };
}

async function getInstagramPostUrl(mediaId: string, pageAccessToken: string): Promise<string | undefined> {
    const maxRetries = 3;
    const retryDelay = 1500;

    for (let i = 0; i < maxRetries; i++) {
        try {
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }

            const res = await axios.get<{ permalink: string }>(
                `${INSTAGRAM_GRAPH_URL}/${mediaId}`,
                {
                    params: {
                        fields: 'permalink',
                        access_token: pageAccessToken,
                    }
                }
            );

            if (res.data.permalink) return res.data.permalink;

            console.warn(`Attempt ${i + 1}: Instagram permalink not found for media ID: ${mediaId}`);
        } catch (error) {
            console.error(`Attempt ${i + 1}: Failed to fetch Instagram permalink for ID: ${mediaId}`, error);
        }
    }

    console.error(`Final failure: Could not fetch Instagram permalink for ID: ${mediaId} after ${maxRetries} attempts.`);
    return undefined;
}
