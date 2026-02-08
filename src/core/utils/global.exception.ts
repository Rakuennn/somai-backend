import { ErrorDefinition } from '../types/error.definition';

export class GlobalException extends Error {
    statusCode: number;
    code: string;
    details: Record<string, unknown> | null;

    constructor(errorDef: ErrorDefinition, customMessage: string | null = null, details: Record<string, unknown> | null = null) {
        super(customMessage || errorDef.message);
        this.statusCode = errorDef.status;
        this.code = errorDef.code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default GlobalException;