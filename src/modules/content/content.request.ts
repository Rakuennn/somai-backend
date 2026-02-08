import { Platform } from "../../core/types/platform.enum";

export interface ContentsRequest {
    brief: string;
    platforms: Platform[];
}

export interface RefineContentsRequest {
    brief: string;
    content: string;
    feedback: string;
}

export interface SubmitContentsRequest {
    content: string;
}
