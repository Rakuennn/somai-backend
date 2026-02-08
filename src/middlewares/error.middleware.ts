import { Request, Response, NextFunction } from 'express';

interface ErrorWithDetails extends Error {
    statusCode?: number;
    code?: string;
    details?: Record<string, unknown>;
}

interface ErrorResponse {
    success: boolean;
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export const errorHandler = (
    err: ErrorWithDetails,
    req: Request,
    res: Response<ErrorResponse>,
    next: NextFunction
): void => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    console.error(`[${statusCode}] ${message}`);
    console.error(err.stack);

    const errorResponse: ErrorResponse = {
        success: false,
        code: err.code || 'INTERNAL_ERROR',
        message,
        ...(err.details && { details: err.details }),
    }

    res.status(statusCode).json(errorResponse);
};

export default errorHandler;