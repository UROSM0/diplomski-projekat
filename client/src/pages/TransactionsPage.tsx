import React, { useEffect, useState } from "react";
import { ITransactionAPI } from "../api/transactions/ITransactionAPI";
import { IUserAPI } from "../api/users/IUserAPI";
import { DashboardNavbar } from "../components/dashboard/navbar/Navbar";
import { useAuth } from "../hooks/useAuthHook";
import { CreateRatingDTO } from "../models/transactions/CreateRatingDTO";
import { TransactionDTO } from "../models/transactions/TransactionDTO";
import { getErrorMessage } from "../api/shared/apiError";

type TransactionsPageProps = {
  transactionAPI: ITransactionAPI;
  userAPI: IUserAPI;
};

export const TransactionsPage: React.FC<TransactionsPageProps> = ({ transactionAPI, userAPI }) => {
  const { token } = useAuth();
  const [purchaseTransactions, setPurchaseTransactions] = useState<TransactionDTO[]>([]);
  const [saleTransactions, setSaleTransactions] = useState<TransactionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { score: string; comment: string }>>({});

  useEffect(() => {
    const loadTransactions = async () => {
      if (!token) {
        setPurchaseTransactions([]);
        setSaleTransactions([]);
        return;
      }

      setIsLoading(true);
      setPageError("");

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
        setPageError(getErrorMessage(error, "Ucavanje transakcija nije uspelo."));
      } finally {
        setIsLoading(false);
      }
    };

    void loadTransactions();
  }, [token, transactionAPI]);

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

    setPageMessage("");

    try {
      const draft = ratingDrafts[transactionId] ?? { score: "5", comment: "" };
      const updatedTransaction = await transactionAPI.createRating(token, transactionId, {
        score: Number(draft.score),
        comment: draft.comment,
      });

      setPurchaseTransactions((current) =>
        current.map((transaction) => (transaction.id === transactionId ? updatedTransaction : transaction))
      );
      setPageMessage("Ocena je uspesno sacuvana.");
    } catch (error) {
      setPageMessage(getErrorMessage(error, "Cuvanje ocene nije uspelo."));
    }
  };

  const formatPrice = (value: number) => `${value.toFixed(2)} RSD`;

  return (
    <div className="page-shell">
      <DashboardNavbar userAPI={userAPI} activePage="transactions" />

      <main className="page-main" style={{ maxWidth: "1180px" }}>
        <section className="card page-hero page-hero-tight" style={{ marginBottom: "16px" }}>
          <div className="flex justify-between gap-3" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div className="hero-kicker">Transakcije</div>
              <h1>Istorija transakcija</h1>
            </div>
            {pageMessage ? <p style={{ marginBottom: 0 }}>{pageMessage}</p> : null}
          </div>
        </section>

        {pageError ? (
          <section className="card" style={{ marginBottom: "16px" }}>
            <p style={{ marginBottom: 0 }}>{pageError}</p>
          </section>
        ) : null}

        <section className="card">
          {isLoading ? (
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
                <h2 style={{ marginBottom: "8px" }}>Moje kupovine</h2>
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
                  <p style={{ marginBottom: 0 }}>Jos nemas nijednu kupovinu.</p>
                )}
              </article>

              <article className="card" style={{ background: "var(--win11-surface-subtle)" }}>
                <h2 style={{ marginBottom: "8px" }}>Moje prodaje</h2>
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
                            : "Kupac jos nije ostavio ocenu."}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginBottom: 0 }}>Jos nemas nijednu prodaju.</p>
                )}
              </article>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
