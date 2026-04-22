import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ITransactionAPI } from "../api/transactions/ITransactionAPI";
import { IUserAPI } from "../api/users/IUserAPI";
import { DashboardNavbar } from "../components/dashboard/navbar/Navbar";
import { useAuth } from "../hooks/useAuthHook";
import { CreateRatingDTO } from "../models/transactions/CreateRatingDTO";
import { TransactionDTO } from "../models/transactions/TransactionDTO";
import { ChangePasswordDTO } from "../models/users/ChangePasswordDTO";
import { UpdateUserAccessDTO } from "../models/users/UpdateUserAccessDTO";
import { UserDTO } from "../models/users/UserDTO";
import { UpdateUserProfileDTO } from "../models/users/UpdateUserProfileDTO";

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
  const [adminUsers, setAdminUsers] = useState<UserDTO[]>([]);
  const [adminUsersError, setAdminUsersError] = useState("");
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false);
  const [adminActionMessage, setAdminActionMessage] = useState("");
  const [accessDrafts, setAccessDrafts] = useState<Record<string, UpdateUserAccessDTO>>({});
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
      } catch (err) {
        setError("Failed to load your profile.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCurrentUser();
  }, [token, userAPI]);

  useEffect(() => {
    const fetchAdminUsers = async () => {
      if (!token || !isAdmin) {
        setAdminUsers([]);
        setAccessDrafts({});
        return;
      }

      setIsAdminUsersLoading(true);
      setAdminUsersError("");

      try {
        const users = await userAPI.getAllUsers(token);
        setAdminUsers(users);
        setAccessDrafts(
          users.reduce<Record<string, UpdateUserAccessDTO>>((drafts, currentUser) => {
            drafts[currentUser.id] = {
              role: currentUser.role,
              status: currentUser.status,
            };
            return drafts;
          }, {})
        );
      } catch {
        setAdminUsersError("Failed to load users for admin management.");
      } finally {
        setIsAdminUsersLoading(false);
      }
    };

    void fetchAdminUsers();
  }, [isAdmin, token, userAPI]);

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
      } catch {
        setTransactionsError("Failed to load transactions.");
      } finally {
        setIsTransactionsLoading(false);
      }
    };

    void fetchTransactions();
  }, [token, transactionAPI]);

  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username
    : authUser?.username ?? "User";

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setIsSavingProfile(true);
    setActionMessage("");

    try {
      const updatedUser = await userAPI.updateCurrentUser(token, profileForm);
      setUser(updatedUser);
      setActionMessage("Profile updated successfully.");
    } catch {
      setActionMessage("Profile update failed.");
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
      setActionMessage(`Wallet topped up successfully by ${Number(topUpAmount).toFixed(2)} RSD.`);
    } catch {
      setActionMessage("Wallet top-up failed.");
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
      setPasswordMessage("Password changed successfully.");
    } catch {
      setPasswordMessage("Password change failed.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAccessDraftChange = (
    userId: string,
    field: keyof UpdateUserAccessDTO,
    value: string
  ) => {
    setAccessDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? {}),
        [field]: value,
      },
    }));
  };

  const handleAccessSave = async (targetUserId: string) => {
    if (!token) return;

    setAdminActionMessage("");

    try {
      const updatedUser = await userAPI.updateUserAccess(
        token,
        targetUserId,
        accessDrafts[targetUserId] ?? {}
      );

      setAdminUsers((current) =>
        current.map((listedUser) => (listedUser.id === targetUserId ? updatedUser : listedUser))
      );
      setAccessDrafts((current) => ({
        ...current,
        [targetUserId]: {
          role: updatedUser.role,
          status: updatedUser.status,
        },
      }));
      setAdminActionMessage(`Access updated for ${updatedUser.username}.`);
    } catch {
      setAdminActionMessage("Access update failed.");
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
      setTransactionsMessage("Rating saved successfully.");
    } catch {
      setTransactionsMessage("Failed to save rating.");
    }
  };

  const formatPrice = (value: number) => `${value.toFixed(2)} RSD`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top right, rgba(96,205,255,0.18), transparent 28%), linear-gradient(180deg, #181818 0%, #111111 100%)",
      }}
    >
      <DashboardNavbar userAPI={userAPI} activePage="dashboard" />

      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "32px 20px 48px",
        }}
      >
        <section
          className="card"
          style={{
            padding: "32px",
            marginBottom: "24px",
            background:
              "linear-gradient(135deg, rgba(96,205,255,0.16) 0%, rgba(45,45,45,0.78) 45%, rgba(30,30,30,0.88) 100%)",
          }}
        >
          <div className="flex justify-between gap-4" style={{ flexWrap: "wrap" }}>
            <div style={{ maxWidth: "620px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--win11-divider)",
                  marginBottom: "16px",
                  fontSize: "12px",
                  color: "var(--win11-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Online Trading Platform
              </div>
              <h1 style={{ marginBottom: "12px" }}>Welcome, {displayName}</h1>
              <p style={{ fontSize: "15px", maxWidth: "56ch", marginBottom: 0 }}>
                Authentication is now connected end-to-end. This dashboard is our first
                authenticated screen and the base we will extend with profile, wallet,
                ads, transactions, chat, and admin workflows.
              </p>
            </div>

            <div
              className="card"
              style={{
                minWidth: "250px",
                padding: "20px",
                background: "rgba(0,0,0,0.22)",
              }}
            >
              <h3 style={{ marginBottom: "12px" }}>Session Snapshot</h3>
              <p style={{ marginBottom: "8px" }}>
                <strong>Username:</strong> {authUser?.username ?? "-"}
              </p>
              <p style={{ marginBottom: "8px" }}>
                <strong>Role:</strong> {authUser?.role ?? "-"}
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong>Status:</strong> {user?.status ?? "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex gap-3" style={{ marginTop: "24px", flexWrap: "wrap" }}>
            <Link className="btn btn-accent" to="/marketplace/all">
              Open Marketplace
            </Link>
          </div>
        </section>

        {error ? (
          <section className="card" style={{ marginBottom: "24px" }}>
            <h3>Profile Loading Error</h3>
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
            <h3>Role</h3>
            <p style={{ marginBottom: 0 }}>{user?.role ?? authUser?.role ?? "-"}</p>
          </article>
          <article className="card">
            <h3>Account Status</h3>
            <p style={{ marginBottom: 0 }}>{user?.status ?? (isLoading ? "Loading..." : "-")}</p>
          </article>
          <article className="card">
            <h3>Wallet Balance</h3>
            <p style={{ marginBottom: 0 }}>
              {typeof user?.balance === "number" ? `${user.balance.toFixed(2)} RSD` : "0.00 RSD"}
            </p>
          </article>
          <article className="card">
            <h3>User ID</h3>
            <p style={{ marginBottom: 0, wordBreak: "break-all" }}>{user?.id ?? authUser?.id ?? "-"}</p>
          </article>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          <article className="card">
            <h3>Profile</h3>
            <p><strong>Email:</strong> {user?.email ?? "-"}</p>
            <p><strong>First name:</strong> {user?.firstName ?? "-"}</p>
            <p style={{ marginBottom: 0 }}><strong>Last name:</strong> {user?.lastName ?? "-"}</p>
          </article>

          <article className="card">
            <h3>Edit Profile</h3>
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="First name"
                value={profileForm.firstName ?? ""}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, firstName: event.target.value }))
                }
              />
              <input
                type="text"
                placeholder="Last name"
                value={profileForm.lastName ?? ""}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, lastName: event.target.value }))
                }
              />
              <input
                type="url"
                placeholder="Profile image URL"
                value={profileForm.profileImage ?? ""}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, profileImage: event.target.value }))
                }
              />
              <button className="btn btn-accent" type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </article>

          <article className="card">
            <h3>Wallet Top-Up</h3>
            <p>Add funds to your in-app wallet for future purchases.</p>
            <form onSubmit={handleTopUpSubmit} className="flex flex-col gap-3">
              <input
                type="number"
                min="1"
                step="0.01"
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(event.target.value)}
              />
              <button className="btn btn-accent" type="submit" disabled={isTopUpLoading}>
                {isTopUpLoading ? "Processing..." : "Top Up Wallet"}
              </button>
            </form>
          </article>

          <article className="card">
            <h3>Change Password</h3>
            <p>Use your current password before setting a new one.</p>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
              <input
                type="password"
                placeholder="Current password"
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
                placeholder="New password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
              />
              <button className="btn btn-accent" type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? "Updating..." : "Change Password"}
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
              <h2 style={{ marginBottom: "8px" }}>Transaction History</h2>
              <p style={{ marginBottom: 0 }}>
                Ovde pratiš svoje kupovine, prodaje i ostavljaš ocene nakon uspešne kupovine.
              </p>
            </div>
            {transactionsMessage ? <p style={{ marginBottom: 0 }}>{transactionsMessage}</p> : null}
          </div>

          {transactionsError ? <p>{transactionsError}</p> : null}
          {isTransactionsLoading ? (
            <p style={{ marginBottom: 0 }}>Loading transactions...</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "16px",
              }}
            >
              <article className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
                <h3 style={{ marginBottom: "8px" }}>Moje kupovine</h3>
                {purchaseTransactions.length ? (
                  <div className="flex flex-col gap-4">
                    {purchaseTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="card"
                        style={{ background: "rgba(0,0,0,0.18)", padding: "16px" }}
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
                              placeholder="Comment about the seller"
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
                              Save Rating
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

              <article className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
                <h3 style={{ marginBottom: "8px" }}>Moje prodaje</h3>
                {saleTransactions.length ? (
                  <div className="flex flex-col gap-4">
                    {saleTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="card"
                        style={{ background: "rgba(0,0,0,0.18)", padding: "16px" }}
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

        {isAdmin ? (
          <section className="card" style={{ marginTop: "24px" }}>
            <div
              className="flex justify-between gap-4"
              style={{ alignItems: "center", flexWrap: "wrap", marginBottom: "20px" }}
            >
              <div>
                <h2 style={{ marginBottom: "8px" }}>Admin User Management</h2>
                <p style={{ marginBottom: 0 }}>
                  Review all registered users and update their roles or statuses.
                </p>
              </div>
              {adminActionMessage ? <p style={{ marginBottom: 0 }}>{adminActionMessage}</p> : null}
            </div>

            {adminUsersError ? <p>{adminUsersError}</p> : null}
            {isAdminUsersLoading ? (
              <p style={{ marginBottom: 0 }}>Loading users...</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "16px",
                }}
              >
                {adminUsers.map((listedUser) => (
                  <article
                    key={listedUser.id}
                    className="card"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <h3 style={{ marginBottom: "8px" }}>{listedUser.username}</h3>
                    <p style={{ marginBottom: "6px" }}>
                      <strong>Email:</strong> {listedUser.email}
                    </p>
                    <p style={{ marginBottom: "14px" }}>
                      <strong>ID:</strong> {listedUser.id}
                    </p>

                    <div className="flex flex-col gap-3">
                      <label className="flex flex-col gap-2">
                        <span>Role</span>
                        <select
                          value={accessDrafts[listedUser.id]?.role ?? listedUser.role}
                          onChange={(event) =>
                            handleAccessDraftChange(listedUser.id, "role", event.target.value)
                          }
                        >
                          <option value="USER">USER</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </label>

                      <label className="flex flex-col gap-2">
                        <span>Status</span>
                        <select
                          value={accessDrafts[listedUser.id]?.status ?? listedUser.status}
                          onChange={(event) =>
                            handleAccessDraftChange(listedUser.id, "status", event.target.value)
                          }
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="BLOCKED">BLOCKED</option>
                        </select>
                      </label>

                      <button
                        className="btn btn-accent"
                        type="button"
                        onClick={() => void handleAccessSave(listedUser.id)}
                        disabled={listedUser.id === authUser?.id}
                      >
                        {listedUser.id === authUser?.id ? "Cannot Edit Yourself" : "Save Access"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
};
