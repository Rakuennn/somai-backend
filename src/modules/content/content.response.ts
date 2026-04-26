import { Platform } from "../../core/types/platform.enum";

export interface ContentItem {
    platform: Platform;
    content: string;
}

export interface ContentsResponse {
    contents: ContentItem[];
}

export interface N8nContentPart {
    text: string;
}

export interface N8nContent {
    parts: N8nContentPart[];
    role: string;
}

export interface N8nGeneratedItem {
    platform: string;
    content: N8nContent;
    finishReason: string;
    index: number;
}

export interface N8nContentNode {
    json: N8nGeneratedItem;
    binary: object;
    pairedItem: { item: number };
}

export interface N8nResponse {
    generated_content: N8nContentNode[];
}

export interface N8nCheckResponse {
    status: string;
    message: string;
    job_id: string;
    result: N8nResponse;
}

export interface N8nRefineResponse {
    status: string;
    message: string;
    job_id: string;
    result: string;
}

export interface CreateContentResponse {
    status: string;
    message: string;
    job_id: string;
}

export interface SpreadsheetRow {
    platform: string;
    timestamp: string;
    link: string;
}

export interface SpreadsheetHistoryResponse {
    rows: SpreadsheetRow[];
}