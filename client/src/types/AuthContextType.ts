import { AuthTokenClaimsType } from "./AuthTokenClaimsType";

export type AuthContextType = {
    user: AuthTokenClaimsType | null;
    token: string | null;
    refreshToken: string | null;
    login: (token: string, refreshToken: string) => void;
    logout: () => Promise<void>;
    refreshSession: () => Promise<boolean>;
    isAuthenticated: boolean;
    isLoading: boolean;
}
