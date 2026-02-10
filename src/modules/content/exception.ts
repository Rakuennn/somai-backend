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
}

export default ContentException;