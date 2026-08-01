import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { IAdAPI } from "../../api/ads/IAdAPI";
import { getErrorMessage } from "../../api/shared/apiError";
import { IUserAPI } from "../../api/users/IUserAPI";
import { useAuth } from "../../hooks/useAuthHook";
import { AdDTO } from "../../models/ads/AdDTO";
import { CategoryDTO } from "../../models/ads/CategoryDTO";
import { ModerateAdDTO } from "../../models/ads/ModerateAdDTO";
import { UserDTO } from "../../models/users/UserDTO";
import { formatUserDisplayName } from "../../utils/userDisplay";

type MarketplaceModerationPageProps = {
  adAPI: IAdAPI;
  userAPI: IUserAPI;
};

export const MarketplaceModerationPage: React.FC<MarketplaceModerationPageProps> = ({ adAPI, userAPI }) => {
  const { token, user } = useAuth();
  const isModerator = ["ADMIN", "MANAGER"].includes(user?.role?.toUpperCase() ?? "");

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [reviewAds, setReviewAds] = useState<AdDTO[]>([]);
  const [sellerDirectory, setSellerDirectory] = useState<Record<string, UserDTO>>({});
  const [moderationDrafts, setModerationDrafts] = useState<Record<string, ModerateAdDTO>>({});
  const [isLoadingReviewAds, setIsLoadingReviewAds] = useState(true);
  const [pageError, setPageError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  const categoryMap = useMemo(
    () =>
      categories.reduce<Record<string, string>>((accumulator, category) => {
        accumulator[category.id] = category.name;
        return accumulator;
      }, {}),
    [categories]
  );

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategories(await adAPI.getCategories());
      } catch (error) {
        setPageError(getErrorMessage(error, "Ucavanje kategorija nije uspelo."));
      }
    };

    void loadCategories();
  }, [adAPI]);

  const refreshReviewAds = async () => {
    if (!token || !isModerator) {
      setReviewAds([]);
      setModerationDrafts({});
      return;
    }

    const response = await adAPI.getAdsForModeration(token, {
      status: "PENDING",
      page: 1,
      limit: 12,
    });

    setReviewAds(response.items);
    setSellerDirectory({});
    setModerationDrafts(
      response.items.reduce<Record<string, ModerateAdDTO>>((accumulator, ad) => {
        accumulator[ad.id] = {
          status: "APPROVED",
          moderationNote: ad.moderationNote || "",
        };
        return accumulator;
      }, {})
    );
  };

  useEffect(() => {
    const loadReviewAds = async () => {
      if (!token || !isModerator) {
        setIsLoadingReviewAds(false);
        return;
      }

      setIsLoadingReviewAds(true);
      setPageError("");

      try {
        await refreshReviewAds();
      } catch (error) {
        setPageError(getErrorMessage(error, "Ucavanje reda za moderaciju nije uspelo."));
      } finally {
        setIsLoadingReviewAds(false);
      }
    };

    void loadReviewAds();
  }, [adAPI, isModerator, token]);

  useEffect(() => {
    const loadSellerDirectory = async () => {
      if (!token || !reviewAds.length) {
        setSellerDirectory({});
        return;
      }

      const sellerIds = Array.from(new Set(reviewAds.map((ad) => ad.sellerId)));
      const sellers = await Promise.allSettled(
        sellerIds.map(async (sellerId) => ({
          sellerId,
          profile: await userAPI.getUserById(token, sellerId),
        }))
      );

      const nextDirectory = sellers.reduce<Record<string, UserDTO>>((directory, result) => {
        if (result.status === "fulfilled") {
          directory[result.value.sellerId] = result.value.profile;
        }

        return directory;
      }, {});

      setSellerDirectory(nextDirectory);
    };

    void loadSellerDirectory();
  }, [reviewAds, token, userAPI]);

  if (!isModerator) {
    return <Navigate to="/marketplace/all" replace />;
  }

  const handleModerationSave = async (adId: string) => {
    if (!token) return;

    setReviewMessage("");

    const moderationDraft = moderationDrafts[adId] ?? { status: "APPROVED" };
    if (moderationDraft.status === "REJECTED" && !moderationDraft.moderationNote?.trim()) {
      setReviewMessage("Komentar je obavezan kada se oglas odbija.");
      return;
    }

    try {
      await adAPI.moderateAd(token, adId, {
        ...moderationDraft,
        moderationNote: moderationDraft.moderationNote?.trim(),
      });
      await refreshReviewAds();
      setReviewMessage("Odluka moderacije je sacuvana.");
    } catch (error) {
      setReviewMessage(getErrorMessage(error, "Cuvanje odluke moderacije nije uspelo."));
    }
  };

  const formatPrice = (value: number) => `${value.toFixed(2)} RSD`;

  return (
    <>
      {pageError ? (
        <section className="card" style={{ marginBottom: "24px" }}>
          <p style={{ marginBottom: 0 }}>{pageError}</p>
        </section>
      ) : null}

      <section className="card">
        <div className="flex justify-between gap-4" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginBottom: "8px" }}>Red za moderaciju</h2>
          </div>
          {reviewMessage ? <p style={{ marginBottom: 0 }}>{reviewMessage}</p> : null}
        </div>

        {isLoadingReviewAds ? (
          <p style={{ marginTop: "16px", marginBottom: 0 }}>Ucavanje reda za moderaciju...</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            {reviewAds.length ? (
              reviewAds.map((ad) => {
                const moderationDraft = moderationDrafts[ad.id] ?? {
                  status: "APPROVED",
                  moderationNote: "",
                };

                return (
                  <article key={ad.id} className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <h3>{ad.title}</h3>
                    <p>
                      <strong>Prodavac:</strong>{" "}
                      {formatUserDisplayName(sellerDirectory[ad.sellerId] ?? { username: ad.sellerId })}
                    </p>
                    <p><strong>Kategorija:</strong> {categoryMap[ad.categoryId] ?? ad.category?.name ?? "-"}</p>
                    <p><strong>Cena:</strong> {formatPrice(ad.price)}</p>
                    <p>{ad.description}</p>
                    <div className="flex flex-col gap-3">
                      <select
                        value={moderationDraft.status}
                        onChange={(event) =>
                          setModerationDrafts((current) => ({
                            ...current,
                            [ad.id]: {
                              ...(current[ad.id] ?? { status: "APPROVED", moderationNote: "" }),
                              status: event.target.value,
                            },
                          }))
                        }
                      >
                        <option value="APPROVED">ODOBRI</option>
                        <option value="REJECTED">ODBIJ</option>
                      </select>
                      <textarea
                        placeholder={
                          moderationDraft.status === "REJECTED"
                            ? "Komentar pri odbijanju (obavezno)"
                            : "Napomena moderatora (opciono)"
                        }
                        required={moderationDraft.status === "REJECTED"}
                        value={moderationDraft.moderationNote ?? ""}
                        onChange={(event) =>
                          setModerationDrafts((current) => ({
                            ...current,
                            [ad.id]: {
                              ...(current[ad.id] ?? { status: "APPROVED", moderationNote: "" }),
                              moderationNote: event.target.value,
                            },
                          }))
                        }
                      />
                      <button
                        className="btn btn-accent"
                        type="button"
                        disabled={
                          moderationDraft.status === "REJECTED" &&
                          !moderationDraft.moderationNote?.trim()
                        }
                        onClick={() => void handleModerationSave(ad.id)}
                      >
                        Sacuvaj odluku
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p style={{ marginBottom: 0 }}>Trenutno nema oglasa koji cekaju moderaciju.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
};
