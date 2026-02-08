import { Response } from 'express';
import { BaseResponse } from '../types/base.response';

// Success with data (200)
export const sendSuccess = <T>(
    res: Response<BaseResponse<T>>,
    data: T,
    message: string = 'Success with data'
): void => {
    res.status(200).json({
        success: true,
        message,
        data
    });
};

// Success without data (201)
export const sendSuccessNoData = (
    res: Response<BaseResponse>,
    message: string = 'Success without data'
): void => {
    res.status(201).json({
        success: true,
        message
    });
};

// No Content (204)
export const sendNoContent = (res: Response): void => {
    res.status(204).send();
};
