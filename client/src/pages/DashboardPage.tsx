import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../api/shared/apiError";
import { ITransactionAPI } from "../api/transactions/ITransactionAPI";
import { IUserAPI } from "../api/users/IUserAPI";
import { DashboardNavbar } from "../components/dashboard/navbar/Navbar";
import { useAuth } from "../hooks/useAuthHook";
import { CreateRatingDTO } from "../models/transactions/CreateRatingDTO";
import { TransactionDTO } from "../models/transactions/TransactionDTO";
import { ChangePasswordDTO } from "../models/users/ChangePasswordDTO";
import { UserDTO } from "../models/users/UserDTO";
import { UpdateUserProfileDTO } from "../models/users/UpdateUserProfileDTO";
import { formatRoleLabel, formatUserStatusLabel } from "../utils/userDisplay";

type DashboardPageProps = {
  transactionAPI: ITransactionAPI;
  userAPI: IUserAPI;
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ transactionAPI, userAPI }) => {
  const { token, user: authUser } = useAuth();
  const isAdmin = authUser?.role?.toUpperCase() === "ADMIN";
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [profileForm, setProfileForm] = useState<UpdateUserProfileDTO>({
    firstName: "",
    lastName: "",
    profileImage: "",
  });
  const [topUpAmount, setTopUpAmount] = useState("1000");
  const [actionMessage, setActionMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState<ChangePasswordDTO>({
    currentPassword: "",
    newPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [purchaseTransactions, setPurchaseTransactions] = useState<TransactionDTO[]>([]);
  const [saleTransactions, setSaleTransactions] = useState<TransactionDTO[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState("");
  const [transactionsMessage, setTransactionsMessage] = useState("");
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { score: string; comment: string }>>({});

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await userAPI.getCurrentUser(token);
        setUser(response);
        setProfileForm({
          firstName: response.firstName ?? "",
          lastName: response.lastName ?? "",
          profileImage: response.profileImage ?? "",
        });
      } catch (error) {
        setError(getErrorMessage(error, "Ucavanje profila nije uspelo."));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCurrentUser();
  }, [token, userAPI]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!token) {
        setPurchaseTransactions([]);
        setSaleTransactions([]);
        return;
      }

      setIsTransactionsLoading(true);
      setTransactionsError("");

      try {
        const [purchases, sales] = await Promise.all([
          transactionAPI.getMyPurchases(token),
          transactionAPI.getMySales(token),
        ]);

        setPurchaseTransactions(purchases);
        setSaleTransactions(sales);
        setRatingDrafts(
          purchases.reduce<Record<string, { score: string; comment: string }>>((drafts, transaction) => {
            drafts[transaction.id] = {
              score: transaction.rating?.score?.toString() ?? "5",
              comment: transaction.rating?.comment ?? "",
            };
            return drafts;
          }, {})
        );
      } catch (error) {
        setTransactionsError(getErrorMessage(error, "Ucavanje transakcija nije uspelo."));
      } finally {
        setIsTransactionsLoading(false);
      }
    };

    void fetchTransactions();
  }, [token, transactionAPI]);

  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username
    : authUser?.username ?? "Korisnik";

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setIsSavingProfile(true);
    setActionMessage("");

    try {
      const updatedUser = await userAPI.updateCurrentUser(token, profileForm);
      setUser(updatedUser);
      setActionMessage("Profil je uspesno sacuvan.");
    } catch (error) {
      setActionMessage(getErrorMessage(error, "Izmena profila nije uspela."));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleTopUpSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setIsTopUpLoading(true);
    setActionMessage("");

    try {
      const updatedUser = await userAPI.topUpBalance(token, {
        amount: Number(topUpAmount),
      });
      setUser(updatedUser);
      setActionMessage(`Novcanik je dopunjen za ${Number(topUpAmount).toFixed(2)} RSD.`);
    } catch (error) {
      setActionMessage(getErrorMessage(error, "Doplata novcanika nije uspela."));
    } finally {
      setIsTopUpLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setIsChangingPassword(true);
    setPasswordMessage("");

    try {
      await userAPI.changePassword(token, passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setPasswordMessage("Lozinka je uspesno promenjena.");
    } catch (error) {
      setPasswordMessage(getErrorMessage(error, "Promena lozinke nije uspela."));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRatingDraftChange = (
    transactionId: string,
    field: keyof CreateRatingDTO | "score",
    value: string
  ) => {
    setRatingDrafts((current) => ({
      ...current,
      [transactionId]: {
        ...(current[transactionId] ?? { score: "5", comment: "" }),
        [field]: value,
      },
    }));
  };

  const handleCreateRating = async (transactionId: string) => {
    if (!token) return;

    setTransactionsMessage("");

    try {
      const draft = ratingDrafts[transactionId] ?? { score: "5", comment: "" };
      const updatedTransaction = await transactionAPI.createRating(token, transactionId, {
        score: Number(draft.score),
        comment: draft.comment,
      });

      setPurchaseTransactions((current) =>
        current.map((transaction) => (transaction.id === transactionId ? updatedTransaction : transaction))
      );
      setTransactionsMessage("Ocena je uspesno sacuvana.");
    } catch (error) {
      setTransactionsMessage(getErrorMessage(error, "Cuvanje ocene nije uspelo."));
    }
  };

  const formatPrice = (value: number) => `${value.toFixed(2)} RSD`;

  return (
    <div className="page-shell">
      <DashboardNavbar userAPI={userAPI} activePage="dashboard" />

      <main className="page-main" style={{ maxWidth: "1120px" }}>
        <section className="card page-hero" style={{ marginBottom: "24px" }}>
          <div className="flex justify-between gap-4" style={{ flexWrap: "wrap" }}>
            <div style={{ maxWidth: "620px" }}>
              <div className="hero-kicker">Nalog</div>
              <h1 style={{ marginBottom: "12px" }}>Zdravo, {displayName}</h1>
            </div>

            <div
              className="card"
              style={{
                minWidth: "250px",
                padding: "20px",
                background: "var(--win11-surface-elevated)",
                border: "1px solid rgba(92, 79, 62, 0.08)",
              }}
            >
              <h3 style={{ marginBottom: "12px" }}>Pregled naloga</h3>
              <p style={{ marginBottom: "8px" }}>
                <strong>Korisnicko ime:</strong> {authUser?.username ?? "-"}
              </p>
              <p style={{ marginBottom: "8px" }}>
                <strong>Rola:</strong> {formatRoleLabel(authUser?.role)}
              </p>
              <p style={{ marginBottom: 0 }}><strong>Status:</strong> {formatUserStatusLabel(user?.status ?? "Ucavanje...")}</p>
            </div>
          </div>
          <div className="flex gap-3" style={{ marginTop: "24px", flexWrap: "wrap" }}>
            <Link className="btn btn-accent" to="/marketplace/all">
              Idi na oglase
            </Link>
          </div>
        </section>

        {error ? (
          <section className="card" style={{ marginBottom: "24px" }}>
            <h3>Greska pri ucitavanju profila</h3>
            <p>{error}</p>
          </section>
        ) : null}

        {actionMessage ? (
          <section className="card" style={{ marginBottom: "24px" }}>
            <p style={{ marginBottom: 0 }}>{actionMessage}</p>
          </section>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <article className="card">
            <h3>Rola</h3>
            <p style={{ marginBottom: 0 }}>{formatRoleLabel(user?.role ?? authUser?.role)}</p>
          </article>
          <article className="card">
            <h3>Status naloga</h3>
            <p style={{ marginBottom: 0 }}>{formatUserStatusLabel(user?.status ?? (isLoading ? "Ucavanje..." : "-"))}</p>
          </article>
          <article className="card">
            <h3>Stanje novcanika</h3>
            <p style={{ marginBottom: 0 }}>
              {typeof user?.balance === "number" ? `${user.balance.toFixed(2)} RSD` : "0.00 RSD"}
            </p>
          </article>
          <article className="card">
            <h3>ID korisnika</h3>
            <p style={{ marginBottom: 0, wordBreak: "break-all" }}>{user?.id ?? authUser?.id ?? "-"}</p>
          </article>
          {isAdmin ? (
            <article className="card">
              <h3>Admin alati</h3>
              <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                <Link className="btn btn-standard" to="/admin/users">
                  Korisnici
                </Link>
                <Link className="btn btn-standard" to="/admin/audit">
                  Aktivnosti
                </Link>
              </div>
            </article>
          ) : null}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          <article className="card">
            <h3>Profil</h3>
            <p><strong>Imejl:</strong> {user?.email ?? "-"}</p>
            <p><strong>Ime:</strong> {user?.firstName ?? "-"}</p>
            <p style={{ marginBottom: 0 }}><strong>Prezime:</strong> {user?.lastName ?? "-"}</p>
          </article>

          <article className="card">
            <h3>Izmena profila</h3>
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Ime"
                value={profileForm.firstName ?? ""}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, firstName: event.target.value }))
                }
              />
              <input
                type="text"
                placeholder="Prezime"
                value={profileForm.lastName ?? ""}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, lastName: event.target.value }))
                }
              />
              <input
                type="url"
                placeholder="Link do profilne slike"
                value={profileForm.profileImage ?? ""}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, profileImage: event.target.value }))
                }
              />
              <button className="btn btn-accent" type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? "Cuvanje..." : "Sacuvaj profil"}
              </button>
            </form>
          </article>

          <article className="card">
            <h3>Doplata novcanika</h3>
            <form onSubmit={handleTopUpSubmit} className="flex flex-col gap-3">
              <input
                type="number"
                min="1"
                step="0.01"
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(event.target.value)}
              />
              <button className="btn btn-accent" type="submit" disabled={isTopUpLoading}>
                {isTopUpLoading ? "Obrada..." : "Dopuni novcanik"}
              </button>
            </form>
          </article>

          <article className="card">
            <h3>Promena lozinke</h3>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
              <input
                type="password"
                placeholder="Trenutna lozinka"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
              />
              <input
                type="password"
                placeholder="Nova lozinka"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
              />
              <button className="btn btn-accent" type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? "Azuriranje..." : "Promeni lozinku"}
              </button>
            </form>
            {passwordMessage ? <p style={{ marginTop: "12px", marginBottom: 0 }}>{passwordMessage}</p> : null}
          </article>
        </section>

        <section className="card" style={{ marginTop: "24px" }}>
          <div
            className="flex justify-between gap-4"
            style={{ alignItems: "center", flexWrap: "wrap", marginBottom: "20px" }}
          >
            <div>
              <h2 style={{ marginBottom: "8px" }}>Istorija transakcija</h2>
            </div>
            {transactionsMessage ? <p style={{ marginBottom: 0 }}>{transactionsMessage}</p> : null}
          </div>

          {transactionsError ? <p>{transactionsError}</p> : null}
          {isTransactionsLoading ? (
            <p style={{ marginBottom: 0 }}>Ucavanje transakcija...</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "16px",
              }}
            >
              <article className="card" style={{ background: "var(--win11-surface-subtle)" }}>
                <h3 style={{ marginBottom: "8px" }}>Moje kupovine</h3>
                {purchaseTransactions.length ? (
                  <div className="flex flex-col gap-4">
                    {purchaseTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="card"
                        style={{ background: "var(--win11-surface-elevated)", padding: "16px" }}
                      >
                        <div className="flex gap-3" style={{ alignItems: "center", marginBottom: "12px" }}>
                          {transaction.adImageUrl ? (
                            <img
                              src={transaction.adImageUrl}
                              alt={transaction.adTitle}
                              style={{
                                width: "72px",
                                height: "72px",
                                objectFit: "cover",
                                borderRadius: "12px",
                                border: "1px solid var(--win11-divider)",
                              }}
                            />
                          ) : null}
                          <div>
                            <strong>{transaction.adTitle}</strong>
                            <p style={{ marginBottom: "4px" }}>{formatPrice(transaction.amount)}</p>
                            <p style={{ marginBottom: 0, color: "var(--win11-text-tertiary)" }}>
                              {new Date(transaction.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {transaction.rating ? (
                          <p style={{ marginBottom: 0 }}>
                            Tvoja ocena: <strong>{transaction.rating.score}/5</strong>
                            {transaction.rating.comment ? ` - ${transaction.rating.comment}` : ""}
                          </p>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <select
                              value={ratingDrafts[transaction.id]?.score ?? "5"}
                              onChange={(event) =>
                                handleRatingDraftChange(transaction.id, "score", event.target.value)
                              }
                            >
                              <option value="5">5</option>
                              <option value="4">4</option>
                              <option value="3">3</option>
                              <option value="2">2</option>
                              <option value="1">1</option>
                            </select>
                            <textarea
                              placeholder="Dodaj komentar o prodavcu"
                              value={ratingDrafts[transaction.id]?.comment ?? ""}
                              onChange={(event) =>
                                handleRatingDraftChange(transaction.id, "comment", event.target.value)
                              }
                            />
                            <button
                              className="btn btn-accent"
                              type="button"
                              onClick={() => void handleCreateRating(transaction.id)}
                            >
                              Sacuvaj ocenu
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginBottom: 0 }}>Još nemaš nijednu kupovinu.</p>
                )}
              </article>

              <article className="card" style={{ background: "var(--win11-surface-subtle)" }}>
                <h3 style={{ marginBottom: "8px" }}>Moje prodaje</h3>
                {saleTransactions.length ? (
                  <div className="flex flex-col gap-4">
                    {saleTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="card"
                        style={{ background: "var(--win11-surface-elevated)", padding: "16px" }}
                      >
                        <div className="flex gap-3" style={{ alignItems: "center", marginBottom: "12px" }}>
                          {transaction.adImageUrl ? (
                            <img
                              src={transaction.adImageUrl}
                              alt={transaction.adTitle}
                              style={{
                                width: "72px",
                                height: "72px",
                                objectFit: "cover",
                                borderRadius: "12px",
                                border: "1px solid var(--win11-divider)",
                              }}
                            />
                          ) : null}
                          <div>
                            <strong>{transaction.adTitle}</strong>
                            <p style={{ marginBottom: "4px" }}>{formatPrice(transaction.amount)}</p>
                            <p style={{ marginBottom: 0, color: "var(--win11-text-tertiary)" }}>
                              {new Date(transaction.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p style={{ marginBottom: 0 }}>
                          {transaction.rating
                            ? `Kupac je ostavio ocenu ${transaction.rating.score}/5${transaction.rating.comment ? ` - ${transaction.rating.comment}` : ""}`
                            : "Kupac još nije ostavio ocenu."}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginBottom: 0 }}>Još nemaš nijednu prodaju.</p>
                )}
              </article>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};
