const notificationTypeLabels: Record<string, string> = {
  AD_APPROVED: "Oglas odobren",
  AD_REJECTED: "Oglas odbijen",
  NEW_MESSAGE: "Nova poruka",
  PURCHASE_SUCCESS: "Kupovina",
  NEW_RATING: "Nova ocena",
};

const notificationTitleLabels: Record<string, string> = {
  "Ad approved": "Oglas je odobren",
  "Ad rejected": "Oglas je odbijen",
  "Purchase completed": "Kupovina je uspesna",
  "Ad sold": "Oglas je prodat",
  "New rating received": "Stigla je nova ocena",
  "New chat message": "Stigla je nova poruka",
};

const auditActionLabels: Record<string, string> = {
  login: "Prijava",
  login_failed: "Neuspesna prijava",
  register: "Registracija",
  register_failed: "Neuspesna registracija",
  logout: "Odjava",
  change_password: "Promena lozinke",
  add_favorite: "Dodavanje u omiljene",
  remove_favorite: "Uklanjanje iz omiljenih",
  change_user_access: "Promena pristupa",
  update_profile: "Izmena profila",
  top_up: "Doplata novcanika",
  create_category: "Kreiranje kategorije",
  create_ad: "Kreiranje oglasa",
  update_ad: "Izmena oglasa",
  delete_ad: "Brisanje oglasa",
  approve_ad: "Odobravanje oglasa",
  reject_ad: "Odbijanje oglasa",
  buy: "Kupovina",
  rate_transaction: "Ocenjivanje transakcije",
  open_conversation: "Otvaranje razgovora",
  send_message: "Slanje poruke",
};

const auditServiceLabels: Record<string, string> = {
  "gateway/auth": "Autentifikacija",
  "gateway/user": "Korisnici",
  "gateway/ad": "Oglasi",
  "gateway/transaction": "Transakcije",
  "gateway/chat": "Poruke",
};

export const formatNotificationTypeLabel = (type: string): string =>
  notificationTypeLabels[type] ?? type.split("_").join(" ");

export const formatNotificationTitle = (title: string, type: string): string =>
  notificationTitleLabels[title] ?? notificationTypeLabels[type] ?? title;

export const formatNotificationContent = (content: string): string => {
  const approvedMatch = content.match(/^Your ad "(.+)" has been approved and is now visible\.$/);
  if (approvedMatch) {
    return `Vas oglas "${approvedMatch[1]}" je odobren i sada je javno vidljiv.`;
  }

  const rejectedMatch = content.match(/^Your ad "(.+)" was rejected\.(?: Note: (.+))?$/);
  if (rejectedMatch) {
    return rejectedMatch[2]
      ? `Vas oglas "${rejectedMatch[1]}" je odbijen. Napomena: ${rejectedMatch[2]}`
      : `Vas oglas "${rejectedMatch[1]}" je odbijen.`;
  }

  const purchasedMatch = content.match(/^You purchased "(.+)" for (.+)\.$/);
  if (purchasedMatch) {
    return `Kupili ste "${purchasedMatch[1]}" za ${purchasedMatch[2]}.`;
  }

  const soldMatch = content.match(/^Your ad "(.+)" has been sold for (.+)\.$/);
  if (soldMatch) {
    return `Vas oglas "${soldMatch[1]}" je prodat za ${soldMatch[2]}.`;
  }

  const ratingMatch = content.match(/^You received a rating of (.+) for "(.+)"\.$/);
  if (ratingMatch) {
    return `Dobili ste ocenu ${ratingMatch[1]} za oglas "${ratingMatch[2]}".`;
  }

  const messageMatch = content.match(/^You have a new message about "(.+)"\.$/);
  if (messageMatch) {
    return `Imate novu poruku za oglas "${messageMatch[1]}".`;
  }

  return content;
};

export const formatAuditActionLabel = (action: string): string => auditActionLabels[action] ?? action;

export const formatAuditServiceLabel = (service: string): string => auditServiceLabels[service] ?? service;

export const formatAuditDescription = (description: string): string => {
  const replacements: Array<[RegExp, (...matches: string[]) => string]> = [
    [/^User (.+) logged in\.$/, (username) => `Korisnik ${username} se prijavio.`],
    [/^Failed login attempt for (.+)\.$/, (username) => `Neuspesan pokusaj prijave za korisnika ${username}.`],
    [/^User (.+) registered\.$/, (username) => `Korisnik ${username} je registrovan.`],
    [/^Failed registration for (.+)\.$/, (username) => `Neuspela registracija za korisnika ${username}.`],
    [/^User logged out\.$/, () => "Korisnik se odjavio."],
    [/^User changed password\.$/, () => "Korisnik je promenio lozinku."],
    [/^User added ad (.+) to favorites\.$/, (adId) => `Oglas ${adId} je dodat u omiljene.`],
    [/^User removed ad (.+) from favorites\.$/, (adId) => `Oglas ${adId} je uklonjen iz omiljenih.`],
    [/^User access changed for (.+)\.$/, (userId) => `Pristup je promenjen za korisnika ${userId}.`],
    [/^User profile updated\.$/, () => "Profil korisnika je azuriran."],
    [/^User topped up wallet by (.+)\.$/, (amount) => `Novcanik je dopunjen za ${amount}.`],
    [/^Category (.+) created\.$/, (name) => `Kategorija ${name} je kreirana.`],
    [/^User created ad (.+)\.$/, (adId) => `Kreiran je oglas ${adId}.`],
    [/^User updated ad (.+)\.$/, (adId) => `Izmenjen je oglas ${adId}.`],
    [/^User deleted ad (.+)\.$/, (adId) => `Obrisan je oglas ${adId}.`],
    [/^Moderator changed moderation status for ad (.+) to (.+)\.$/, (adId, status) => `Moderator je promenio status oglasa ${adId} na ${status}.`],
    [/^User purchased ad (.+)\.$/, (adId) => `Korisnik je kupio oglas ${adId}.`],
    [/^User rated transaction (.+)\.$/, (transactionId) => `Korisnik je ocenio transakciju ${transactionId}.`],
    [/^User opened conversation for ad (.+)\.$/, (adId) => `Otvoren je razgovor za oglas ${adId}.`],
    [/^User sent a message in conversation (.+)\.$/, (conversationId) => `Poslata je poruka u razgovoru ${conversationId}.`],
  ];

  for (const [pattern, formatter] of replacements) {
    const match = description.match(pattern);
    if (match) {
      return formatter(...match.slice(1));
    }
  }

  return description;
};
