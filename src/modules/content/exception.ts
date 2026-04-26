import { GlobalException } from '../../core/utils/global.exception';
import { ErrorDefinitions } from '../../core/constants/error.definitions';
import { ErrorDefinition } from '../../core/types/error.definition';

export class ContentException extends GlobalException {
    constructor(errorDef: ErrorDefinition, customMessage: string | null = null, details: Record<string, unknown> | null = null) {
        super(errorDef, customMessage, details);
    }

    static spreadsheetSaveFailed(): ContentException {
        return new ContentException(ErrorDefinitions.CONTENT_SPREADSHEET_SAVE_FAILED);
    }

    static n8nFailed(): ContentException {
        return new ContentException(ErrorDefinitions.CONTENT_N8N_FAILED);
    }

    static n8nFailedWithMessage(message: string): ContentException {
        return new ContentException(ErrorDefinitions.VALIDATION_ERROR, message);
    }

    static platformNotConnected(platform: string): ContentException {
        return new ContentException(ErrorDefinitions.PLATFORM_NOT_CONNECTED, `Platform ${platform} is not connected.`);
    }

    static invalidImage(): ContentException {
        return new ContentException(ErrorDefinitions.VALIDATION_ERROR, 'Instagram requires a valid attached image to post.');
    }

    static unauthorized(): ContentException {
        return new ContentException(ErrorDefinitions.AUTH_UNAUTHORIZED);
    }

    static pollingTimeout(): ContentException {
        return new ContentException(ErrorDefinitions.CONTENT_POLLING_TIMEOUT);
    }

    static pollingCancelled(): ContentException {
        return new ContentException(ErrorDefinitions.CONTENT_POLLING_CANCELLED);
    }

    static pollingUnexpectedStatus(status: string): ContentException {
        return new ContentException(ErrorDefinitions.CONTENT_POLLING_UNEXPECTED_STATUS, `Unexpected status: ${status}`);
    }
}

export default ContentException;