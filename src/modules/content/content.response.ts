import { Platform } from "../../core/types/platform.enum";

export interface ContentItem {
    id: string;
    platform: Platform;
    brief: string;
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