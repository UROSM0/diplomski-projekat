import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { IAdAPI } from "../../api/ads/IAdAPI";
import { useAuth } from "../../hooks/useAuthHook";
import { AdDTO } from "../../models/ads/AdDTO";
import { CategoryDTO } from "../../models/ads/CategoryDTO";
import { ModerateAdDTO } from "../../models/ads/ModerateAdDTO";

type MarketplaceModerationPageProps = {
  adAPI: IAdAPI;
};

export const MarketplaceModerationPage: React.FC<MarketplaceModerationPageProps> = ({ adAPI }) => {
  const { token, user } = useAuth();
  const isModerator = ["ADMIN", "MANAGER"].includes(user?.role?.toUpperCase() ?? "");

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [reviewAds, setReviewAds] = useState<AdDTO[]>([]);
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
      } catch {
        setPageError("Failed to load categories.");
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
      } catch {
        setPageError("Failed to load moderation queue.");
      } finally {
        setIsLoadingReviewAds(false);
      }
    };

    void loadReviewAds();
  }, [adAPI, isModerator, token]);

  if (!isModerator) {
    return <Navigate to="/marketplace/all" replace />;
  }

  const handleModerationSave = async (adId: string) => {
    if (!token) return;

    setReviewMessage("");

    try {
      await adAPI.moderateAd(token, adId, moderationDrafts[adId] ?? { status: "APPROVED" });
      await refreshReviewAds();
      setReviewMessage("Moderation decision saved.");
    } catch {
      setReviewMessage("Failed to save moderation decision.");
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
            <h2 style={{ marginBottom: "8px" }}>Moderation Queue</h2>
            <p style={{ marginBottom: 0 }}>
              Ovde pregledas sve oglase koji cekaju odobravanje ili odbijanje.
            </p>
          </div>
          {reviewMessage ? <p style={{ marginBottom: 0 }}>{reviewMessage}</p> : null}
        </div>

        {isLoadingReviewAds ? (
          <p style={{ marginTop: "16px", marginBottom: 0 }}>Loading moderation queue...</p>
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
                    <p><strong>Seller ID:</strong> {ad.sellerId}</p>
                    <p><strong>Category:</strong> {categoryMap[ad.categoryId] ?? ad.category?.name ?? "-"}</p>
                    <p><strong>Price:</strong> {formatPrice(ad.price)}</p>
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
                        <option value="APPROVED">APPROVED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                      <textarea
                        placeholder="Moderation note"
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
                        onClick={() => void handleModerationSave(ad.id)}
                      >
                        Save Moderation
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p style={{ marginBottom: 0 }}>No pending ads at the moment.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
};
