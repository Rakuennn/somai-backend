import { GlobalException } from '../core/utils/global.exception';
import { ErrorDefinitions } from '../core/constants/error.definitions';
import { ErrorDefinition } from '../core/types/error.definition';

export class AuthException extends GlobalException {
    constructor(errorDef: ErrorDefinition, customMessage: string | null = null) {
        super(errorDef, customMessage);
    }

    static invalidToken(): AuthException {
        return new AuthException(ErrorDefinitions.AUTH_TOKEN_INVALID);
    }

    static tokenExpired(): AuthException {
        return new AuthException(ErrorDefinitions.AUTH_TOKEN_EXPIRED);
    }

    static tokenRequired(): AuthException {
        return new AuthException(ErrorDefinitions.AUTH_TOKEN_REQUIRED);
    }

    static unauthorized(): AuthException {
        return new AuthException(ErrorDefinitions.AUTH_UNAUTHORIZED);
    }
}

export default AuthException;