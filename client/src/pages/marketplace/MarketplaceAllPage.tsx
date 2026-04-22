import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IAdAPI } from "../../api/ads/IAdAPI";
import { IUserAPI } from "../../api/users/IUserAPI";
import { useAuth } from "../../hooks/useAuthHook";
import { AdDTO } from "../../models/ads/AdDTO";
import { CategoryDTO } from "../../models/ads/CategoryDTO";

type MarketplaceAllPageProps = {
  adAPI: IAdAPI;
  userAPI: IUserAPI;
};

export const MarketplaceAllPage: React.FC<MarketplaceAllPageProps> = ({ adAPI, userAPI }) => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [publicAds, setPublicAds] = useState<AdDTO[]>([]);
  const [favoriteAdIds, setFavoriteAdIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    categoryId: "",
  });
  const [isLoadingPublicAds, setIsLoadingPublicAds] = useState(true);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [pageError, setPageError] = useState("");

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

  useEffect(() => {
    const loadPublicAds = async () => {
      setIsLoadingPublicAds(true);
      setPageError("");

      try {
        const response = await adAPI.getPublicAds({
          search: filters.search || undefined,
          categoryId: filters.categoryId || undefined,
          page: 1,
          limit: 12,
        });
        setPublicAds(response.items);
      } catch {
        setPageError("Failed to load marketplace ads.");
      } finally {
        setIsLoadingPublicAds(false);
      }
    };

    void loadPublicAds();
  }, [adAPI, filters.categoryId, filters.search]);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!token) {
        setFavoriteAdIds([]);
        setIsLoadingFavorites(false);
        return;
      }

      setIsLoadingFavorites(true);

      try {
        const favorites = await userAPI.getFavorites(token);
        setFavoriteAdIds(favorites.map((favorite) => favorite.adId));
      } catch {
        setFavoriteAdIds([]);
      } finally {
        setIsLoadingFavorites(false);
      }
    };

    void loadFavorites();
  }, [token, userAPI]);

  const toggleFavorite = async (adId: string) => {
    if (!token) return;

    setPageError("");

    try {
      if (favoriteAdIds.includes(adId)) {
        await userAPI.removeFavorite(token, adId);
        setFavoriteAdIds((current) => current.filter((currentAdId) => currentAdId !== adId));
      } else {
        await userAPI.addFavorite(token, { adId });
        setFavoriteAdIds((current) => [...current, adId]);
      }
    } catch {
      setPageError("Failed to update favorites.");
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

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <article className="card">
          <h3>Search Marketplace</h3>
          <div className="flex flex-col gap-3">
            <input
              type="search"
              placeholder="Search ads by title or description"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
            />
            <select
              value={filters.categoryId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  categoryId: event.target.value,
                }))
              }
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </article>

        <article className="card">
          <h3>Marketplace Status</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
            }}
          >
            <div className="list-item" style={{ cursor: "default" }}>
              <div>
                <strong>Categories</strong>
                <p style={{ marginBottom: 0 }}>{categories.length}</p>
              </div>
            </div>
            <div className="list-item" style={{ cursor: "default" }}>
              <div>
                <strong>Public Ads</strong>
                <p style={{ marginBottom: 0 }}>{publicAds.length}</p>
              </div>
            </div>
            <div className="list-item" style={{ cursor: "default" }}>
              <div>
                <strong>Favorites</strong>
                <p style={{ marginBottom: 0 }}>{isLoadingFavorites ? "..." : favoriteAdIds.length}</p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="card">
        <div className="flex justify-between gap-4" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginBottom: "8px" }}>Svi oglasi</h2>
            <p style={{ marginBottom: 0 }}>
              Ovde vidiš sve odobrene oglase i možeš da ih dodaješ u omiljene.
            </p>
          </div>
        </div>

        {isLoadingPublicAds ? (
          <p style={{ marginTop: "16px", marginBottom: 0 }}>Loading ads...</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            {publicAds.length ? (
              publicAds.map((ad) => {
                const isFavorite = favoriteAdIds.includes(ad.id);

                return (
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
                      {categoryMap[ad.categoryId] ?? ad.category?.name ?? "Unknown category"}
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
                      className={isFavorite ? "btn btn-standard" : "btn btn-accent"}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void toggleFavorite(ad.id);
                      }}
                      disabled={isLoadingFavorites}
                      style={{ width: "100%" }}
                    >
                      {isFavorite ? "Ukloni iz omiljenih" : "Dodaj u omiljene"}
                    </button>
                  </article>
                );
              })
            ) : (
              <p style={{ marginBottom: 0 }}>No approved ads match the current filters.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
};
