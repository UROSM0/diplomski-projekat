import axios from "axios";

const STATIC_MESSAGE_MAP: Record<string, string> = {
  "Unauthorized.": "Morate biti prijavljeni.",
  "You can only access your own data!": "Mozete pristupiti samo svojim podacima.",
  "You cannot change your own role or status.": "Ne mozete menjati sopstvenu rolu ili status.",
  "Invalid user id.": "Identifikator korisnika nije validan.",
  "User id is required.": "Nedostaje identifikator korisnika.",
  "At least one access field must be provided.": "Izaberite bar jednu izmenu pristupa.",
  "Top-up amount must be greater than zero.": "Iznos dopune mora biti veci od nule.",
  "Balance adjustment amount must be a non-zero number.": "Iznos izmene stanja mora biti razlicit od nule.",
  "Insufficient balance for this adjustment.": "Na racunu nema dovoljno sredstava za ovu izmenu.",
  "Invalid user role.": "Izabrana uloga nije validna.",
  "Invalid user status.": "Izabrani status nije validan.",
  "Notification title is required.": "Naslov obavestenja je obavezan.",
  "Notification content is required.": "Sadrzaj obavestenja je obavezan.",
  "Notification id is required.": "Nedostaje identifikator obavestenja.",
  "Invalid notification id.": "Identifikator obavestenja nije validan.",
  "Notification not found.": "Obavestenje nije pronadjeno.",
  "Invalid notification type.": "Tip obavestenja nije validan.",
  "Ad id is required.": "Nedostaje identifikator oglasa.",
  "Invalid ad id.": "Identifikator oglasa nije validan.",
  "Ad not found.": "Oglas nije pronadjen.",
  "Seller id is required.": "Nedostaje identifikator prodavca.",
  "Moderator id is required.": "Nedostaje identifikator moderatora.",
  "Category name is required.": "Naziv kategorije je obavezan.",
  "Category is required.": "Kategorija je obavezna.",
  "Category not found.": "Kategorija nije pronadjena.",
  "Price must be greater than zero.": "Cena mora biti veca od nule.",
  "Minimum price must be zero or greater.": "Minimalna cena ne moze biti negativna.",
  "Maximum price must be zero or greater.": "Maksimalna cena ne moze biti negativna.",
  "Minimum price cannot be greater than maximum price.": "Minimalna cena ne moze biti veca od maksimalne.",
  "Start date cannot be after end date.": "Pocetni datum ne moze biti posle krajnjeg datuma.",
  "Invalid ad date filter.": "Datum u filteru nije validan.",
  "Ad title is required.": "Naslov oglasa je obavezan.",
  "Ad description is required.": "Opis oglasa je obavezan.",
  "Invalid ad status.": "Status oglasa nije validan.",
  "Moderation can only set APPROVED or REJECTED status.": "Moderacija moze postaviti samo odobren ili odbijen status.",
  "You cannot start a conversation with yourself.": "Ne mozete zapoceti razgovor sa sobom.",
  "Conversation not found.": "Razgovor nije pronadjen.",
  "Invalid conversation id.": "Identifikator razgovora nije validan.",
  "Conversation id and user id are required.": "Nedostaje identifikator razgovora.",
  "Message content is required.": "Poruka ne moze biti prazna.",
  "Requester id is required.": "Nedostaje identifikator korisnika.",
  "Participant id is required.": "Nedostaje identifikator sagovornika.",
  "You can only access your own conversations.": "Mozete pristupiti samo svojim razgovorima.",
  "This ad has already been purchased.": "Oglas je vec kupljen.",
  "This ad is not available for purchase.": "Oglas trenutno nije dostupan za kupovinu.",
  "You cannot purchase your own ad.": "Ne mozete kupiti svoj oglas.",
  "Your account is not active for purchases.": "Vas nalog trenutno nije aktivan za kupovinu.",
  "The seller account is not active.": "Nalog prodavca trenutno nije aktivan.",
  "Insufficient wallet balance.": "Nemate dovoljno novca na racunu.",
  "Transaction not found.": "Transakcija nije pronadjena.",
  "Invalid transaction id.": "Identifikator transakcije nije validan.",
  "Only transaction participants can rate this transaction.": "Samo kupac i prodavac mogu oceniti ovu transakciju.",
  "You have already rated this transaction.": "Vec ste ocenili ovu transakciju.",
  "Rating score must be between 1 and 5.": "Ocena mora biti izmedju 1 i 5.",
  "Current password and new password are required.": "Unesite trenutnu i novu lozinku.",
  "New password must be at least 6 characters long.": "Nova lozinka mora imati najmanje 6 karaktera.",
  "New password must be different from the current password.": "Nova lozinka mora biti drugacija od trenutne.",
  "Current password is incorrect.": "Trenutna lozinka nije ispravna.",
  "User not found.": "Korisnik nije pronadjen.",
  "Failed to load notifications.": "Ucavanje obavestenja nije uspelo.",
  "Failed to update notification.": "Izmena obavestenja nije uspela.",
  "Failed to mark notifications as read.": "Oznacavanje obavestenja nije uspelo.",
  "Failed to load conversations.": "Ucavanje razgovora nije uspelo.",
  "Failed to load messages.": "Ucavanje poruka nije uspelo.",
  "Failed to send message.": "Slanje poruke nije uspelo.",
  "Failed to start chat.": "Pokretanje razgovora nije uspelo.",
  "Failed to update favorites.": "Izmena omiljenih oglasa nije uspela.",
  "Failed to load ad details.": "Ucavanje detalja oglasa nije uspelo.",
  "Failed to load categories.": "Ucavanje kategorija nije uspelo.",
  "Failed to load marketplace ads.": "Ucavanje oglasa nije uspelo.",
  "Failed to load your ads.": "Ucavanje vasih oglasa nije uspelo.",
  "Ad creation failed.": "Kreiranje oglasa nije uspelo.",
  "Ad update failed.": "Izmena oglasa nije uspela.",
  "Ad deletion failed.": "Brisanje oglasa nije uspelo.",
  "Category creation failed.": "Kreiranje kategorije nije uspelo.",
  "Failed to load moderation queue.": "Ucavanje reda za moderaciju nije uspelo.",
  "Failed to save moderation decision.": "Cuvanje odluke moderacije nije uspelo.",
  "Failed to load your profile.": "Ucavanje profila nije uspelo.",
  "Profile update failed.": "Izmena profila nije uspela.",
  "Wallet top-up failed.": "Doplata novcanika nije uspela.",
  "Password change failed.": "Promena lozinke nije uspela.",
  "Access update failed.": "Izmena pristupa nije uspela.",
  "Failed to load users for admin management.": "Ucavanje korisnika nije uspelo.",
  "Failed to load transactions.": "Ucavanje transakcija nije uspelo.",
  "Failed to save rating.": "Cuvanje ocene nije uspelo.",
  "Purchase failed.": "Kupovina nije uspela.",
  "Rating failed.": "Ocenjivanje nije uspelo.",
};

const DYNAMIC_MESSAGE_MAP: Array<[RegExp, string]> = [
  [/^User with ID .+ not found$/, "Korisnik nije pronadjen."],
  [/^You can only (delete|update) your own ads\.$/, "Mozete menjati ili brisati samo svoje oglase."],
  [/^User profile creation failed:/, "Kreiranje korisnickog profila nije uspelo."],
];

export const toUserFriendlyMessage = (message: string): string => {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) {
    return "Doslo je do greske.";
  }

  const directMessage = STATIC_MESSAGE_MAP[normalizedMessage];
  if (directMessage) {
    return directMessage;
  }

  for (const [pattern, replacement] of DYNAMIC_MESSAGE_MAP) {
    if (pattern.test(normalizedMessage)) {
      return replacement;
    }
  }

  return normalizedMessage;
};

export const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    const responseMessage = (error.response?.data as { message?: string } | undefined)?.message;
    return toUserFriendlyMessage(responseMessage ?? fallbackMessage);
  }

  if (error instanceof Error && error.message.trim()) {
    return toUserFriendlyMessage(error.message);
  }

  return toUserFriendlyMessage(fallbackMessage);
};

export const createApiError = (error: unknown, fallbackMessage: string): Error =>
  new Error(getErrorMessage(error, fallbackMessage));
