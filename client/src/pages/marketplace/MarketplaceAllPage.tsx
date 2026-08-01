import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IAdAPI } from "../../api/ads/IAdAPI";
import { getErrorMessage } from "../../api/shared/apiError";
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
    minPrice: "",
    maxPrice: "",
    dateFrom: "",
    dateTo: "",
  });
  const [isLoadingPublicAds, setIsLoadingPublicAds] = useState(true);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [pageError, setPageError] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const advancedFilterCount = [filters.minPrice, filters.maxPrice, filters.dateFrom, filters.dateTo].filter(
    Boolean
  ).length;

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

  useEffect(() => {
    const loadPublicAds = async () => {
      setIsLoadingPublicAds(true);
      setPageError("");

      try {
        const response = await adAPI.getPublicAds({
          search: filters.search || undefined,
          categoryId: filters.categoryId || undefined,
          minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          page: 1,
          limit: 12,
        });
        setPublicAds(response.items);
      } catch (error) {
        setPageError(getErrorMessage(error, "Ucavanje oglasa nije uspelo."));
      } finally {
        setIsLoadingPublicAds(false);
      }
    };

    void loadPublicAds();
  }, [
    adAPI,
    filters.categoryId,
    filters.dateFrom,
    filters.dateTo,
    filters.maxPrice,
    filters.minPrice,
    filters.search,
  ]);

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
    } catch (error) {
      setPageError(getErrorMessage(error, "Izmena omiljenih oglasa nije uspela."));
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

      <section className="card" style={{ marginBottom: "16px", padding: "14px 16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 1fr) minmax(170px, 240px) auto auto",
            gap: "10px",
            alignItems: "center",
          }}
        >
            <input
              type="search"
              placeholder="Pretrazi po nazivu ili opisu"
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
              <option value="">Sve kategorije</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              className={showAdvancedFilters || advancedFilterCount ? "btn btn-standard" : "btn btn-ghost"}
              type="button"
              onClick={() => setShowAdvancedFilters((current) => !current)}
            >
              Jos filtera{advancedFilterCount ? ` (${advancedFilterCount})` : ""}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                setFilters({
                  search: "",
                  categoryId: "",
                  minPrice: "",
                  maxPrice: "",
                  dateFrom: "",
                  dateTo: "",
                });
                setShowAdvancedFilters(false);
              }}
            >
              Ponisti
            </button>
        </div>

        {showAdvancedFilters ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(130px, 1fr))",
              gap: "10px",
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px solid var(--win11-divider)",
            }}
          >
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Cena od"
              aria-label="Minimalna cena"
              value={filters.minPrice}
              onChange={(event) =>
                setFilters((current) => ({ ...current, minPrice: event.target.value }))
              }
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Cena do"
              aria-label="Maksimalna cena"
              value={filters.maxPrice}
              onChange={(event) =>
                setFilters((current) => ({ ...current, maxPrice: event.target.value }))
              }
            />
            <label className="flex flex-col gap-2" style={{ fontSize: "12px" }}>
              <span>Datum od</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, dateFrom: event.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-2" style={{ fontSize: "12px" }}>
              <span>Datum do</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, dateTo: event.target.value }))
                }
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="flex justify-between gap-4" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginBottom: "4px" }}>Svi oglasi</h2>
            <p style={{ marginBottom: 0, color: "var(--win11-text-tertiary)" }}>
              {isLoadingPublicAds ? "Ucavanje..." : `${publicAds.length} oglasa`}
              {token ? ` · ${isLoadingFavorites ? "..." : favoriteAdIds.length} omiljenih` : ""}
            </p>
          </div>
        </div>

        {isLoadingPublicAds ? (
          <p style={{ marginTop: "16px", marginBottom: 0 }}>Ucavanje oglasa...</p>
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
                        <span style={{ color: "var(--win11-text-tertiary)" }}>Nema slike</span>
                      </div>
                    )}
                    <p style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {categoryMap[ad.categoryId] ?? ad.category?.name ?? "Nepoznata kategorija"}
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
              <p style={{ marginBottom: 0 }}>Nema oglasa za izabrane filtere.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
};
