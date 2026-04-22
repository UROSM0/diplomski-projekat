import { AuthTokenClaimsType } from "./AuthTokenClaims";

export type AuthResponseType = {
    success: boolean;
    message?: string;
    token?: string;
    refreshToken?: string;
    user?: AuthTokenClaimsType;
}
