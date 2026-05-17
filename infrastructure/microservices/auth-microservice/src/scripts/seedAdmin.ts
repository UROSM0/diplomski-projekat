import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { UserRole as PrismaUserRole, UserStatus } from "@prisma/client";
import prisma from "../Prisma/client";

dotenv.config({ quiet: true });

type UserProfile = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  profileImage: string;
};

const adminConfig = {
  username: process.env.ADMIN_USERNAME ?? "admin",
  email: process.env.ADMIN_EMAIL ?? "admin@example.com",
  password: process.env.ADMIN_PASSWORD ?? "Admin123!",
  firstName: process.env.ADMIN_FIRST_NAME ?? "System",
  lastName: process.env.ADMIN_LAST_NAME ?? "Admin",
};

async function main(): Promise<void> {
  const userServiceUrl = process.env.USER_SERVICE_URL ?? process.env.USER_SERVICE_API;
  if (!userServiceUrl) {
    throw new Error("USER_SERVICE_URL is required to create the admin profile.");
  }

  const existingUserWithEmail = await prisma.authUser.findUnique({
    where: { email: adminConfig.email },
  });

  if (existingUserWithEmail && existingUserWithEmail.username !== adminConfig.username) {
    throw new Error(`Email ${adminConfig.email} is already used by another auth user.`);
  }

  const passwordHash = await bcrypt.hash(
    adminConfig.password,
    Number(process.env.SALT_ROUNDS ?? "10")
  );

  const authUser = await prisma.authUser.upsert({
    where: { username: adminConfig.username },
    update: {
      email: adminConfig.email,
      passwordHash,
      role: PrismaUserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      username: adminConfig.username,
      email: adminConfig.email,
      passwordHash,
      role: PrismaUserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await upsertUserProfile(userServiceUrl, {
    id: authUser.id,
    username: authUser.username,
    email: authUser.email,
    firstName: adminConfig.firstName,
    lastName: adminConfig.lastName,
    role: PrismaUserRole.ADMIN,
    status: UserStatus.ACTIVE,
    profileImage: "",
  });

  console.log("Admin user is ready.");
  console.log(`Username: ${adminConfig.username}`);
  console.log(`Password: ${adminConfig.password}`);
}

async function upsertUserProfile(baseUrl: string, profile: UserProfile): Promise<void> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const existingResponse = await fetchWithServiceHint(`${normalizedBaseUrl}/users/${profile.id}`);

  if (existingResponse.ok) {
    const accessResponse = await fetchWithServiceHint(`${normalizedBaseUrl}/users/${profile.id}/access`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: profile.role,
        status: profile.status,
      }),
    });

    if (!accessResponse.ok) {
      throw new Error(`Admin profile access update failed: ${await accessResponse.text()}`);
    }

    const profileResponse = await fetchWithServiceHint(`${normalizedBaseUrl}/users/${profile.id}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: profile.firstName,
        lastName: profile.lastName,
        profileImage: profile.profileImage,
      }),
    });

    if (!profileResponse.ok) {
      throw new Error(`Admin profile update failed: ${await profileResponse.text()}`);
    }

    return;
  }

  if (existingResponse.status !== 404) {
    throw new Error(`Admin profile lookup failed: ${await existingResponse.text()}`);
  }

  const createResponse = await fetchWithServiceHint(`${normalizedBaseUrl}/internal/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });

  if (!createResponse.ok) {
    throw new Error(`Admin profile creation failed: ${await createResponse.text()}`);
  }
}

async function fetchWithServiceHint(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw new Error(
      `Cannot reach user-microservice at ${url}. Start user-microservice first and check USER_SERVICE_URL in auth-microservice/.env. Original error: ${(error as Error).message}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
