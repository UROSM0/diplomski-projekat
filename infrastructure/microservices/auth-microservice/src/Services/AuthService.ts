import { AuthUser, PrismaClient, UserRole as PrismaUserRole, UserStatus as PrismaUserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { IAuthService } from "../Domain/services/IAuthService";
import { LoginUserDTO } from "../Domain/DTOs/LoginUserDTO";
import { RegistrationUserDTO } from "../Domain/DTOs/RegistrationUserDTO";
import { ChangePasswordDTO } from "../Domain/DTOs/ChangePasswordDTO";
import { UpdateUserAccessDTO } from "../Domain/DTOs/UpdateUserAccessDTO";
import { AuthResponseType } from "../Domain/types/AuthResponse";
import { AuthTokenClaims } from "../Domain/types/AuthTokenClaims";
import { UserRole } from "../Domain/enums/UserRole";

export class AuthService implements IAuthService {
  private readonly saltRounds: number = parseInt(process.env.SALT_ROUNDS || "10", 10);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Login user
   */
  async login(data: LoginUserDTO): Promise<AuthResponseType> {
    const user = await this.prisma.authUser.findUnique({ where: { username: data.username } });
    if (!user) return { authenificated: false };
    if (user.status !== PrismaUserStatus.ACTIVE) return { authenificated: false };

    const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordMatches) return { authenificated: false };

    return {
      authenificated: true,
      userData: this.toAuthTokenClaims(user),
    };
  }

  /**
   * Register new user
   */
  async register(data: RegistrationUserDTO): Promise<AuthResponseType> {
    // Check if username or email already exists
    const existingUser = await this.prisma.authUser.findFirst({
      where: {
        OR: [{ username: data.username }, { email: data.email }],
      },
    });

    if (existingUser) return { authenificated: false };

    const hashedPassword = await bcrypt.hash(data.password, this.saltRounds);

    const savedUser = await this.prisma.authUser.create({
      data: {
        username: data.username,
        email: data.email,
        role: this.normalizeRole(data.role),
        status: PrismaUserStatus.ACTIVE,
        passwordHash: hashedPassword,
      },
    });

    try {
      await this.createUserProfile(savedUser.id, data);
    } catch (error) {
      await this.prisma.authUser.delete({ where: { id: savedUser.id } });
      throw error;
    }

    return {
      authenificated: true,
      userData: this.toAuthTokenClaims(savedUser),
    };
  }

  async changePassword(data: ChangePasswordDTO): Promise<void> {
    if (!data.userId?.trim()) {
      throw new Error("User id is required.");
    }

    if (!data.currentPassword?.trim() || !data.newPassword?.trim()) {
      throw new Error("Current password and new password are required.");
    }

    if (data.newPassword.trim().length < 6) {
      throw new Error("New password must be at least 6 characters long.");
    }

    if (data.currentPassword === data.newPassword) {
      throw new Error("New password must be different from the current password.");
    }

    const user = await this.prisma.authUser.findUnique({ where: { id: data.userId } });
    if (!user) {
      throw new Error("User not found.");
    }

    const passwordMatches = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new Error("Current password is incorrect.");
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, this.saltRounds);
    await this.prisma.authUser.update({
      where: { id: data.userId },
      data: {
        passwordHash: hashedPassword,
      },
    });
  }

  async updateUserAccess(userId: string, data: UpdateUserAccessDTO): Promise<void> {
    if (!userId?.trim()) {
      throw new Error("User id is required.");
    }

    const role = data.role ? this.normalizeRole(data.role) : undefined;
    const status = data.status ? this.normalizeStatus(data.status) : undefined;

    if (!role && !status) {
      throw new Error("At least one access field must be provided.");
    }

    await this.prisma.authUser.update({
      where: { id: userId },
      data: {
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
      },
    });
  }

  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async validateRefreshToken(token: string): Promise<AuthTokenClaims | null> {
    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        token,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!refreshToken || refreshToken.user.status !== PrismaUserStatus.ACTIVE) {
      return null;
    }

    return this.toAuthTokenClaims(refreshToken.user);
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        token,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private toAuthTokenClaims(user: AuthUser): AuthTokenClaims {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  private normalizeRole(role?: UserRole | string): PrismaUserRole {
    const normalizedRole = role?.toString().trim().toUpperCase();
    if (!normalizedRole) return PrismaUserRole.USER;
    if (normalizedRole === UserRole.ADMIN) return PrismaUserRole.ADMIN;
    if (normalizedRole === UserRole.MANAGER) return PrismaUserRole.MANAGER;
    if (normalizedRole === UserRole.USER) return PrismaUserRole.USER;

    throw new Error("Invalid user role.");
  }

  private normalizeStatus(status?: string): PrismaUserStatus {
    const normalizedStatus = status?.trim().toUpperCase();

    if (normalizedStatus === PrismaUserStatus.ACTIVE) return PrismaUserStatus.ACTIVE;
    if (normalizedStatus === PrismaUserStatus.INACTIVE) return PrismaUserStatus.INACTIVE;
    if (normalizedStatus === PrismaUserStatus.BLOCKED) return PrismaUserStatus.BLOCKED;

    throw new Error("Invalid user status.");
  }

  private async createUserProfile(authUserId: string, data: RegistrationUserDTO): Promise<void> {
    const userServiceUrl = process.env.USER_SERVICE_URL ?? process.env.USER_SERVICE_API;
    if (!userServiceUrl) {
      throw new Error("USER_SERVICE_URL is not configured.");
    }

    const response = await fetch(`${userServiceUrl}/internal/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: authUserId,
        username: data.username,
        email: data.email,
        firstName: data.firstName?.trim() || data.username,
        lastName: data.lastName?.trim() || data.username,
        role: this.normalizeRole(data.role),
        status: PrismaUserStatus.ACTIVE,
        profileImage: data.profileImage ?? "",
      }),
    });

    if (!response.ok) {
      const responseBody = (await response.text()) || "Unknown error";
      throw new Error(`User profile creation failed: ${responseBody}`);
    }
  }
}
