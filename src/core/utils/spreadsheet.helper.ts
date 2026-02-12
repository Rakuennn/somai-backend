import { drive_v3, google, sheets_v4 } from "googleapis";

function createAuth(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return auth;
}

export function createSheetsClient(accessToken: string): sheets_v4.Sheets {
    return google.sheets({ version: 'v4', auth: createAuth(accessToken) });
}

function createDriveClient(accessToken: string): drive_v3.Drive {
    return google.drive({ version: 'v3', auth: createAuth(accessToken) });
}

export async function findExistingSpreadsheet(
    accessToken: string,
    title: string
): Promise<string | undefined> {
    try {
        const drive = createDriveClient(accessToken);
        const response = await drive.files.list({
            q: `name='${title}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
            fields: 'files(id, name)',
            pageSize: 1
        });

        if (response.data.files && response.data.files.length > 0) {
            console.log('Found existing spreadsheet:', response.data.files[0].id);
            return response.data.files[0].id!;
        }
        return undefined;
    } catch (error) {
        console.error('Failed to search spreadsheet:', error);
        return undefined;
    }
}

export async function createUserSpreadsheet(
    accessToken: string,
    title: string = 'Somai History'
): Promise<string> {
    try {
        const sheets = createSheetsClient(accessToken);
        const spreadsheet = await sheets.spreadsheets.create({
            requestBody: {
                properties: { title }
            }
        });

        const spreadsheetId = spreadsheet.data.spreadsheetId!;
        console.log('Created spreadsheet:', spreadsheetId);
        return spreadsheetId;
    } catch (error) {
        console.error('Failed to create spreadsheet:', error);
        throw error;
    }
}