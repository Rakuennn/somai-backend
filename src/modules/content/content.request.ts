import { Platform } from "../../core/types/platform.enum";

export interface ContentsRequest {
    brief: string;
    platforms: Platform[];
}

export interface RefineContentsRequest {
    content: string;
    feedback: string;
    platform: Platform;
}

export interface SubmitContentsRequest {
    content: string;
    platform: Platform;
    link?: string;
}
