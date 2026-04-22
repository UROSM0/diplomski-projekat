import { UserRole } from "../enums/UserRole";

export interface RegistrationUserDTO {
    username: string;
    password: string;
    email: string;
    role?: UserRole;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
}
