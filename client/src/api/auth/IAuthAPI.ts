import { RefreshTokenDTO } from "../../models/auth/RefreshTokenDTO";
import { LoginUserDTO } from "../../models/auth/LoginUserDTO";
import { RegistrationUserDTO } from "../../models/auth/RegistrationUserDTO";
import { AuthResponseType } from "../../types/AuthResponseType";

export interface IAuthAPI {
  login(data: LoginUserDTO): Promise<AuthResponseType>;
  register(data: RegistrationUserDTO): Promise<AuthResponseType>;
  refresh(data: RefreshTokenDTO): Promise<AuthResponseType>;
  logout(data: RefreshTokenDTO): Promise<AuthResponseType>;
}
