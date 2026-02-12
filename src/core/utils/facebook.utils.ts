import axios from 'axios';

const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v24.0';

interface FacebookPostParams {
    pageId: string;
    pageAccessToken: string;
    message: string;
    link?: string;
    scheduledPublishTime?: number;
    image?: string | Buffer;
}

interface FacebookPhotoParams {
    pageId: string;
    pageAccessToken: string;
    message: string;
    scheduledPublishTime?: number;
    image?: string | Buffer;
}

interface FacebookPostResponse {
    id: string;
    post_id?: string;
    url?: string;
}

export async function publishToFacebookPage({
    pageId,
    pageAccessToken,
    message,
    link,
    scheduledPublishTime,
    image
}: FacebookPostParams): Promise<FacebookPostResponse> {
    const body: Record<string, string | boolean> = {
        message,
    };

    if (link) {
        body.link = link;
    }

    if (scheduledPublishTime) {
        body.published = false;
        body.scheduled_publish_time = String(scheduledPublishTime);
    }

    const res = await axios.post<FacebookPostResponse>(
        `${FACEBOOK_GRAPH_URL}/${pageId}/feed`,
        body,
        {
            headers: { 'Content-Type': 'application/json' },
            params: { access_token: pageAccessToken },
        }
    );

    const url = await getFacebookPostUrl(res.data.id, pageAccessToken);

    return {
        ...res.data,
        url
    };
}

export async function publishFacebookPhoto({
    pageId,
    pageAccessToken,
    message,
    scheduledPublishTime,
    image
}: FacebookPhotoParams): Promise<FacebookPostResponse> {

    if (Buffer.isBuffer(image)) {
        const formData = new FormData();
        formData.append('source', new Blob([image as any]), 'image.jpg');
        formData.append('caption', message);

        if (scheduledPublishTime) {
            formData.append('published', 'false');
            formData.append('scheduled_publish_time', String(scheduledPublishTime));
        }

        const res = await axios.post<FacebookPostResponse>(
            `${FACEBOOK_GRAPH_URL}/${pageId}/photos`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                params: { access_token: pageAccessToken },
            }
        );

        const url = await getFacebookPostUrl(res.data.id, pageAccessToken);

        return {
            ...res.data,
            url
        };

    } else {
        const body: Record<string, string | boolean> = {
            url: image!,
            caption: message
        };

        if (scheduledPublishTime) {
            body.published = false;
            body.scheduled_publish_time = String(scheduledPublishTime);
        }

        const res = await axios.post<FacebookPostResponse>(
            `${FACEBOOK_GRAPH_URL}/${pageId}/photos`,
            body,
            {
                headers: { 'Content-Type': 'application/json' },
                params: { access_token: pageAccessToken },
            }
        );

        const url = await getFacebookPostUrl(res.data.id, pageAccessToken);

        return {
            ...res.data,
            url
        };
    }
}

async function getFacebookPostUrl(postId: string, pageAccessToken: string): Promise<string | undefined> {
    try {
        const getRes = await axios.get<{ permalink_url?: string; link?: string }>(
            `${FACEBOOK_GRAPH_URL}/${postId}`,
            {
                params: {
                    fields: 'permalink_url,link',
                    access_token: pageAccessToken
                }
            }
        );
        return getRes.data.permalink_url || getRes.data.link;
    } catch (error) {
        console.error('Failed to fetch post URL:', error);
        return undefined;
    }
}
