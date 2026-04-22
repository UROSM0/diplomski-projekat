import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IAdAPI } from "../../api/ads/IAdAPI";
import { IUserAPI } from "../../api/users/IUserAPI";
import { useAuth } from "../../hooks/useAuthHook";
import { AdDTO } from "../../models/ads/AdDTO";

type MarketplaceFavoritesPageProps = {
  adAPI: IAdAPI;
  userAPI: IUserAPI;
};

export const MarketplaceFavoritesPage: React.FC<MarketplaceFavoritesPageProps> = ({ adAPI, userAPI }) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [favoriteAds, setFavoriteAds] = useState<AdDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    const loadFavorites = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setPageError("");

      try {
        const favorites = await userAPI.getFavorites(token);
        if (!favorites.length) {
          setFavoriteAds([]);
          return;
        }

        const favoriteResults = await Promise.allSettled(
          favorites.map((favorite) => adAPI.getPublicAdById(favorite.adId))
        );

        const resolvedAds = favoriteResults
          .filter((result): result is PromiseFulfilledResult<AdDTO> => result.status === "fulfilled")
          .map((result) => result.value);

        setFavoriteAds(resolvedAds);
      } catch {
        setFavoriteAds([]);
        setPageError("Failed to load favorite ads.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadFavorites();
  }, [adAPI, token, userAPI]);

  const handleRemoveFavorite = async (adId: string) => {
    if (!token) return;

    try {
      await userAPI.removeFavorite(token, adId);
      setFavoriteAds((current) => current.filter((ad) => ad.id !== adId));
    } catch {
      setPageError("Failed to remove ad from favorites.");
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
        <h2 style={{ marginBottom: "8px" }}>Omiljeni oglasi</h2>
        <p>Ovde su svi oglasi koje si sačuvao za kasnije.</p>

        {isLoading ? (
          <p style={{ marginTop: "16px", marginBottom: 0 }}>Loading favorite ads...</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            {favoriteAds.length ? (
              favoriteAds.map((ad) => (
                <article
                  key={ad.id}
                  className="card"
                  onClick={() => navigate(`/marketplace/ads/${ad.id}`)}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                  }}
                >
                  {ad.imageUrls[0] ? (
                    <img
                      src={ad.imageUrls[0]}
                      alt={ad.title}
                      style={{
                        width: "100%",
                        height: "160px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        marginBottom: "14px",
                        border: "1px solid var(--win11-divider)",
                      }}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center"
                      style={{
                        height: "160px",
                        borderRadius: "10px",
                        marginBottom: "14px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid var(--win11-divider)",
                      }}
                    >
                      <span style={{ color: "var(--win11-text-tertiary)" }}>No image</span>
                    </div>
                  )}
                  <p style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {ad.category?.name ?? "Unknown category"}
                  </p>
                  <h3>{ad.title}</h3>
                  <p>{ad.description}</p>
                  <div className="flex justify-between gap-3" style={{ alignItems: "center", marginBottom: "14px" }}>
                    <strong>{formatPrice(ad.price)}</strong>
                    <span style={{ fontSize: "12px", color: "var(--win11-text-tertiary)" }}>
                      {new Date(ad.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="btn btn-standard"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleRemoveFavorite(ad.id);
                    }}
                    style={{ width: "100%" }}
                  >
                    Ukloni iz omiljenih
                  </button>
                </article>
              ))
            ) : (
              <p style={{ marginBottom: 0 }}>
                Još nemaš omiljene oglase. Dodaj ih sa stranice <strong>Svi oglasi</strong>.
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
};
