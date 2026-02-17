import { Response } from 'express';

export const sendPostMessageResponse = (
    res: Response,
    data: Record<string, unknown>,
    success: boolean = true
): void => {
    const payload = JSON.stringify({ ...data, success });

    res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Login</title></head>
        <body>
            <p>${success ? 'Login successful! This window will close...' : 'Login failed.'}</p>
            <script>
                if (window.opener) {
                    window.opener.postMessage(${payload}, '*');
                    window.close();
                }
            </script>
        </body>
        </html>
    `);
};
