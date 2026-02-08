import { BaseResponse } from '../../core/types/base.response';
import { UserPayload } from '../../core/types/userpayload.types';

export interface LoginData {
    accessToken: string;
    refreshToken: string;
    user: UserPayload;
}

export interface RefreshData {
    accessToken: string;
}

export type LoginResponse = BaseResponse<LoginData>;
export type RefreshResponse = BaseResponse<RefreshData>;