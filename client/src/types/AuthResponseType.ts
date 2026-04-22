export type AuthResponseType = {
    success: boolean;
    message?: string;
    token?: string;
    refreshToken?: string;
    user?: {
        id: string;
        username: string;
        role: string;
    };
}
