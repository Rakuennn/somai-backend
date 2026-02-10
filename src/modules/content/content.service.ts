import axios from "axios";
import { createSheetsClient } from "../../core/utils/spreadsheet.helper";

export interface SpreadsheetRowData {
    platform: string;
    timestamp: string;
    link?: string;
    content: string;
}

export async function appendToSpreadsheet(
    accessToken: string,
    spreadsheetId: string,
    data: SpreadsheetRowData
): Promise<boolean> {
    try {
        const sheets = createSheetsClient(accessToken);

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:D',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    data.platform,
                    data.timestamp,
                    data.link || '',
                    data.content
                ]]
            }
        });

        console.log('Appended to spreadsheet:', spreadsheetId);
        return true;
    } catch (error) {
        console.error('Failed to append to spreadsheet:', error);
        return false;
    }
}
