import { UserPayload } from "../../../core/types/userpayload.types";

export interface GoogleLoginResponse {
    accessToken: string;
    refreshToken: string;
    user: UserPayload;
}