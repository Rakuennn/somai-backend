import { ErrorDefinition } from '../types/error.definition';

export const ErrorDefinitions: Record<string, ErrorDefinition> = {
    AUTH_INVALID_CREDENTIALS: { code: 'AUTH_INVALID_CREDENTIALS', status: 401, message: 'Invalid credentials' },
    AUTH_TOKEN_EXPIRED: { code: 'AUTH_TOKEN_EXPIRED', status: 401, message: 'Token expired' },
    AUTH_TOKEN_INVALID: { code: 'AUTH_TOKEN_INVALID', status: 401, message: 'Invalid token' },
    AUTH_TOKEN_REQUIRED: { code: 'AUTH_TOKEN_REQUIRED', status: 401, message: 'Token required' },
    AUTH_REFRESH_TOKEN_REQUIRED: { code: 'AUTH_REFRESH_TOKEN_REQUIRED', status: 400, message: 'Refresh token required in x-refresh-token header' },
    AUTH_GOOGLE_CREDENTIALS_NOT_FOUND: { code: 'AUTH_GOOGLE_CREDENTIALS_NOT_FOUND', status: 400, message: 'Google credentials not found in token' },
    AUTH_UNAUTHORIZED: { code: 'AUTH_UNAUTHORIZED', status: 401, message: 'Unauthorized' },
    AUTH_FORBIDDEN: { code: 'AUTH_FORBIDDEN', status: 403, message: 'Forbidden' },
    USER_NOT_FOUND: { code: 'USER_NOT_FOUND', status: 404, message: 'User not found' },
    RESOURCE_NOT_FOUND: { code: 'RESOURCE_NOT_FOUND', status: 404, message: 'Resource not found' },
    VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400, message: 'Validation error' },
    INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500, message: 'Internal server error' },
    CONTENT_SPREADSHEET_SAVE_FAILED: { code: 'CONTENT_SPREADSHEET_SAVE_FAILED', status: 500, message: 'Failed to save to spreadsheet' },
};

export default ErrorDefinitions;