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
