import { GlobalException } from '../../core/utils/global.exception';
import { ErrorDefinitions } from '../../core/constants/error.definitions';
import { ErrorDefinition } from '../../core/types/error.definition';

export class AuthException extends GlobalException {
    constructor(errorDef: ErrorDefinition, customMessage: string | null = null, details: Record<string, unknown> | null = null) {
        super(errorDef, customMessage, details);
    }

    static forbidden(): AuthException {
        return new AuthException(ErrorDefinitions.AUTH_FORBIDDEN);
    }

    static tokenRequired(): AuthException {
        return new AuthException(ErrorDefinitions.AUTH_TOKEN_REQUIRED);
    }

    static invalidToken(): AuthException {
        return new AuthException(ErrorDefinitions.AUTH_TOKEN_INVALID);
    }

    static tokenExpired(): AuthException {
        return new AuthException(ErrorDefinitions.AUTH_TOKEN_EXPIRED);
    }
}

export default AuthException;