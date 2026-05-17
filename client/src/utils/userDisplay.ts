type DisplayableUser = {
  username?: string;
  firstName?: string;
  lastName?: string;
};

export const formatUserDisplayName = (user?: DisplayableUser | null): string => {
  if (!user) {
    return "Nepoznat korisnik";
  }

  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  const username = user.username?.trim() ?? "";

  if (fullName && username) {
    return `${fullName} (@${username})`;
  }

  if (fullName) {
    return fullName;
  }

  if (username) {
    return username;
  }

  return "Nepoznat korisnik";
};

export const formatRoleLabel = (role?: string | null): string => {
  switch (role?.toUpperCase()) {
    case "ADMIN":
      return "Administrator";
    case "MANAGER":
      return "Menadzer";
    case "USER":
      return "Korisnik";
    default:
      return role ?? "Nepoznata rola";
  }
};

export const formatUserStatusLabel = (status?: string | null): string => {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "Aktivan";
    case "INACTIVE":
      return "Neaktivan";
    case "BLOCKED":
      return "Blokiran";
    default:
      return status ?? "Nepoznat status";
  }
};

export const formatAdStatusLabel = (status?: string | null): string => {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return "Na proveri";
    case "APPROVED":
      return "Aktivan";
    case "REJECTED":
      return "Odbijen";
    case "SOLD":
      return "Prodat";
    default:
      return status ?? "Nepoznat status";
  }
};
