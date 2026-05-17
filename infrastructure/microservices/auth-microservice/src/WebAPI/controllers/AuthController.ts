import { Request, Response, Router } from 'express';
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { IAuthService } from '../../Domain/services/IAuthService';
import { LoginUserDTO } from '../../Domain/DTOs/LoginUserDTO';
import { RegistrationUserDTO } from '../../Domain/DTOs/RegistrationUserDTO';
import { RefreshTokenDTO } from '../../Domain/DTOs/RefreshTokenDTO';
import { ChangePasswordDTO } from '../../Domain/DTOs/ChangePasswordDTO';
import { UpdateUserAccessDTO } from '../../Domain/DTOs/UpdateUserAccessDTO';
import { validateLoginData } from '../validators/LoginValidator';
import { validateRegistrationData } from '../validators/RegisterValidator';
import { ILogerService } from '../../Domain/services/ILogerService';

export class AuthController {
  private router: Router;
  private authService: IAuthService;
  private readonly logerService: ILogerService;

  constructor(authService: IAuthService, logerService: ILogerService) {
    this.router = Router();
    this.authService = authService;
    this.logerService = logerService;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post('/auth/login', this.login.bind(this));
    this.router.post('/auth/register', this.register.bind(this));
    this.router.post('/auth/refresh', this.refresh.bind(this));
    this.router.post('/auth/logout', this.logout.bind(this));
    this.router.post('/auth/change-password', this.changePassword.bind(this));
    this.router.patch('/internal/users/:id/access', this.updateUserAccess.bind(this));
  }

  /**
   * POST /api/v1/auth/login
   * Authenticates a userData?
   */
  private async login(req: Request, res: Response): Promise<void> {
    try {
      this.logerService.log("Login request received");
      const accessTokenExpiresIn = (process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m') as SignOptions["expiresIn"];

      const data: LoginUserDTO = req.body as LoginUserDTO;

      // Validate login input
      const validation = validateLoginData(data);
      if (!validation.success) {
        res.status(400).json({ success: false, message: validation.message });
        return;
      }

      const result = await this.authService.login(data);

      if (result.authenificated) {
        const userData = result.userData!;
        const token = this.signAccessToken(userData, accessTokenExpiresIn);
        const refreshToken = this.signRefreshToken(userData);
        const refreshTokenExpiresAt = this.getRefreshTokenExpiryDate();

        await this.authService.saveRefreshToken(userData.id, refreshToken, refreshTokenExpiresAt);

        res.status(200).json({ success: true, token, refreshToken, user: userData });
      } else {
        res.status(401).json({ success: false, message: "Invalid credentials!" });
      }
    } catch (error) {
      this.logerService.log(error as string)
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /**
   * POST /api/v1/auth/register
   * Registers a new userData?
   */
  private async register(req: Request, res: Response): Promise<void> {
    try {
      this.logerService.log("Registration request received");
      const accessTokenExpiresIn = (process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m') as SignOptions["expiresIn"];

      const data: RegistrationUserDTO = req.body as RegistrationUserDTO;

      // Validate registration input
      const validation = validateRegistrationData(data);
      if (!validation.success) {
        res.status(400).json({ success: false, message: validation.message });
        return;
      }

      const result = await this.authService.register(data);

      if (result.authenificated) {
        const userData = result.userData!;
        const token = this.signAccessToken(userData, accessTokenExpiresIn);
        const refreshToken = this.signRefreshToken(userData);
        const refreshTokenExpiresAt = this.getRefreshTokenExpiryDate();

        await this.authService.saveRefreshToken(userData.id, refreshToken, refreshTokenExpiresAt);

        res.status(201).json({ success: true, message: "Registration successful", token, refreshToken, user: userData });
      } else {
        res.status(400).json({ success: false, message: "Registration failed. Username or email may already exist." });
      }
    } catch (error) {
      this.logerService.log(error as string)
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  private async refresh(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as RefreshTokenDTO;
      if (!data.refreshToken) {
        res.status(400).json({ success: false, message: "Refresh token is required." });
        return;
      }

      jwt.verify(data.refreshToken, process.env.JWT_REFRESH_SECRET ?? "");

      const user = await this.authService.validateRefreshToken(data.refreshToken);
      if (!user) {
        res.status(401).json({ success: false, message: "Invalid refresh token." });
        return;
      }

      const accessTokenExpiresIn = (process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m') as SignOptions["expiresIn"];
      const token = this.signAccessToken(user, accessTokenExpiresIn);

      res.status(200).json({ success: true, token, refreshToken: data.refreshToken, user });
    } catch (error) {
      this.logerService.log(error as string);
      res.status(401).json({ success: false, message: "Invalid refresh token." });
    }
  }

  private async logout(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as RefreshTokenDTO;
      if (!data.refreshToken) {
        res.status(400).json({ success: false, message: "Refresh token is required." });
        return;
      }

      await this.authService.revokeRefreshToken(data.refreshToken);
      res.status(200).json({ success: true, message: "Logout successful." });
    } catch (error) {
      this.logerService.log(error as string);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  private async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as ChangePasswordDTO;
      await this.authService.changePassword(data);
      res.status(200).json({ success: true, message: "Password changed successfully." });
    } catch (error) {
      this.logerService.log(error as string);
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  }

  private async updateUserAccess(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id?.trim()) {
        res.status(400).json({ success: false, message: "Invalid user id." });
        return;
      }

      const data = req.body as UpdateUserAccessDTO;
      await this.authService.updateUserAccess(id, data);
      res.status(200).json({ success: true, message: "User access updated successfully." });
    } catch (error) {
      this.logerService.log(error as string);
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  }

  private signAccessToken(
    userData: NonNullable<Awaited<ReturnType<IAuthService["login"]>>["userData"]>,
    expiresIn: SignOptions["expiresIn"]
  ): string {
    return jwt.sign(
      { id: userData.id, username: userData.username, role: userData.role },
      process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? "",
      { expiresIn }
    );
  }

  private signRefreshToken(
    userData: NonNullable<Awaited<ReturnType<IAuthService["login"]>>["userData"]>
  ): string {
    const refreshTokenExpiresIn = (process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d') as SignOptions["expiresIn"];

    return jwt.sign(
      { id: userData.id, username: userData.username, role: userData.role },
      process.env.JWT_REFRESH_SECRET ?? "",
      { expiresIn: refreshTokenExpiresIn }
    );
  }

  private getRefreshTokenExpiryDate(): Date {
    const expiresInDays = Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS ?? "7");
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiresInDays);
    return expiryDate;
  }

  public getRouter(): Router {
    return this.router;
  }
}
