import axios from "axios";
import { createSheetsClient } from "../../core/utils/spreadsheet.helper";
import { ContentException } from "./exception";
import { N8nCheckResponse, N8nRefineResponse, N8nResponse } from "./content.response";

export interface SpreadsheetRowData {
    platform: string;
    timestamp: string;
    link?: string;
}

export async function appendToSpreadsheet(
    accessToken: string,
    spreadsheetId: string,
    data: SpreadsheetRowData
): Promise<boolean> {
    try {
        const sheets = createSheetsClient(accessToken);
        const msg = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetTitle = msg.data.sheets?.[0].properties?.title;

        if (!sheetTitle) {
            console.error('No sheet found in spreadsheet:', spreadsheetId);
            return false;
        }

        const rangeName = `'${sheetTitle}'`;
        const checkRows = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${rangeName}!A1:D1`
        });
        const availableValues = checkRows.data.values;
        const valuesToAppend: string[][] = [];

        if (!availableValues || availableValues.length === 0) {
            valuesToAppend.push(['Platform', 'Timestamp', 'Link']);
        }

        valuesToAppend.push([
            data.platform,
            data.timestamp,
            data.link || '',
        ]);

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: rangeName,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: valuesToAppend
            }
        });

        console.log('Appended to spreadsheet:', spreadsheetId, 'Sheet:', sheetTitle);
        return true;
    } catch (error) {
        console.error('Failed to append to spreadsheet:', error);
        return false;
    }
}

export async function pollForResult(jobId: string, signal?: AbortSignal): Promise<N8nResponse> {
    const maxAttempts = 20;
    let delayMs = 1000;
    const url = process.env.SOMA_N8N_URL;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (signal?.aborted) throw ContentException.pollingCancelled();

        const { data } = await axios.post<N8nCheckResponse>(
            `${url}/webhook/SOMAi/check-status`,
            { job_id: jobId },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SOMA_N8N_TOKEN}`,
                },
                signal,
            }
        );

        if (data.status === 'done') return data.result;
        if (data.status !== 'processing') throw ContentException.pollingUnexpectedStatus(data.status);

        await delay(delayMs, signal);
        delayMs = Math.min(delayMs * 2, 10_000);
    }

    throw ContentException.pollingTimeout();
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(ContentException.pollingCancelled());
        }, { once: true });
    });
}