import { LoginUserDTO } from "../DTOs/LoginUserDTO";
import { RegistrationUserDTO } from "../DTOs/RegistrationUserDTO";
import { ChangePasswordDTO } from "../DTOs/ChangePasswordDTO";
import { UpdateUserAccessDTO } from "../DTOs/UpdateUserAccessDTO";
import { AuthResponseType } from "../types/AuthResponse";
import { AuthTokenClaims } from "../types/AuthTokenClaims";

export interface IAuthService {
  login(data: LoginUserDTO): Promise<AuthResponseType>;
  register(data: RegistrationUserDTO): Promise<AuthResponseType>;
  changePassword(data: ChangePasswordDTO): Promise<void>;
  updateUserAccess(userId: string, data: UpdateUserAccessDTO): Promise<void>;
  saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  validateRefreshToken(token: string): Promise<AuthTokenClaims | null>;
  revokeRefreshToken(token: string): Promise<void>;
}
