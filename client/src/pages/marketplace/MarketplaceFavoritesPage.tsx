import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IAdAPI } from "../../api/ads/IAdAPI";
import { getErrorMessage } from "../../api/shared/apiError";
import { IUserAPI } from "../../api/users/IUserAPI";
import { useAuth } from "../../hooks/useAuthHook";
import { AdDTO } from "../../models/ads/AdDTO";
import { FavoriteDTO } from "../../models/users/FavoriteDTO";

type MarketplaceFavoritesPageProps = {
  adAPI: IAdAPI;
  userAPI: IUserAPI;
};

type FavoriteListItem = {
  favorite: FavoriteDTO;
  ad: AdDTO | null;
};

export const MarketplaceFavoritesPage: React.FC<MarketplaceFavoritesPageProps> = ({ adAPI, userAPI }) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [favoriteItems, setFavoriteItems] = useState<FavoriteListItem[]>([]);
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
          setFavoriteItems([]);
          return;
        }

        const favoriteResults = await Promise.allSettled(
          favorites.map((favorite) => adAPI.getPublicAdById(favorite.adId))
        );

        setFavoriteItems(
          favorites.map((favorite, index) => ({
            favorite,
            ad: favoriteResults[index]?.status === "fulfilled" ? favoriteResults[index].value : null,
          }))
        );
      } catch (error) {
        setFavoriteItems([]);
        setPageError(getErrorMessage(error, "Ucavanje omiljenih oglasa nije uspelo."));
      } finally {
        setIsLoading(false);
      }
    };

    void loadFavorites();
  }, [adAPI, token, userAPI]);

  const handleRemoveFavorite = async (adId: string) => {
    if (!token) {
      return;
    }

    try {
      await userAPI.removeFavorite(token, adId);
      setFavoriteItems((current) => current.filter((item) => item.favorite.adId !== adId));
    } catch (error) {
      setPageError(getErrorMessage(error, "Uklanjanje oglasa iz omiljenih nije uspelo."));
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

        {isLoading ? (
          <p style={{ marginTop: "16px", marginBottom: 0 }}>Ucavanje omiljenih oglasa...</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            {favoriteItems.length ? (
              favoriteItems.map((item) => {
                const { favorite, ad } = item;

                if (!ad) {
                  return (
                    <article
                      key={favorite.adId}
                      className="card"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px dashed var(--win11-divider)",
                      }}
                    >
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
                        <span style={{ color: "var(--win11-text-tertiary)" }}>Nedostupan oglas</span>
                      </div>
                      <p style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Nije javno vidljiv
                      </p>
                      <h3>Oglas vise nije javno dostupan</h3>
                      <p>
                        Ovaj oglas je i dalje sacuvan u omiljenima, ali trenutno nije javno vidljiv.
                      </p>
                      <div className="flex justify-between gap-3" style={{ alignItems: "center", marginBottom: "14px" }}>
                        <strong>Sacuvan oglas</strong>
                        <span style={{ fontSize: "12px", color: "var(--win11-text-tertiary)" }}>
                          {new Date(favorite.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        className="btn btn-standard"
                        type="button"
                        onClick={() => void handleRemoveFavorite(favorite.adId)}
                        style={{ width: "100%" }}
                      >
                        Ukloni iz omiljenih
                      </button>
                    </article>
                  );
                }

                return (
                  <article
                    key={favorite.adId}
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
                        <span style={{ color: "var(--win11-text-tertiary)" }}>Nema slike</span>
                      </div>
                    )}
                    <p style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {ad.category?.name ?? "Nepoznata kategorija"}
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
                );
              })
            ) : (
              <p style={{ marginBottom: 0 }}>
                Jos nemas omiljene oglase. Dodaj ih sa stranice <strong>Svi oglasi</strong>.
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
};
