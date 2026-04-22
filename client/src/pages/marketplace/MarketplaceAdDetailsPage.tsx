import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { IAdAPI } from "../../api/ads/IAdAPI";
import { ITransactionAPI } from "../../api/transactions/ITransactionAPI";
import { IUserAPI } from "../../api/users/IUserAPI";
import { useAuth } from "../../hooks/useAuthHook";
import { AdDTO } from "../../models/ads/AdDTO";

type MarketplaceAdDetailsPageProps = {
  adAPI: IAdAPI;
  transactionAPI: ITransactionAPI;
  userAPI: IUserAPI;
};

export const MarketplaceAdDetailsPage: React.FC<MarketplaceAdDetailsPageProps> = ({
  adAPI,
  transactionAPI,
  userAPI,
}) => {
  const { adId } = useParams<{ adId: string }>();
  const { token, user } = useAuth();

  const [ad, setAd] = useState<AdDTO | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [pageError, setPageError] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const loadAd = async () => {
      if (!adId) {
        setPageError("Ad not found.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setPageError("");

      try {
        const [loadedAd, favorites] = await Promise.all([
          adAPI.getPublicAdById(adId),
          token ? userAPI.getFavorites(token) : Promise.resolve([]),
        ]);

        setAd(loadedAd);
        setIsFavorite(favorites.some((favorite) => favorite.adId === adId));
        setSelectedImageIndex(0);
      } catch {
        setPageError("Failed to load ad details.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadAd();
  }, [adAPI, adId, token, userAPI]);

  const selectedImage = useMemo(() => {
    if (!ad?.imageUrls.length) {
      return "";
    }

    return ad.imageUrls[Math.min(selectedImageIndex, ad.imageUrls.length - 1)] ?? "";
  }, [ad, selectedImageIndex]);

  const handleToggleFavorite = async () => {
    if (!token || !adId) {
      return;
    }

    setIsUpdatingFavorite(true);
    setPageError("");

    try {
      if (isFavorite) {
        await userAPI.removeFavorite(token, adId);
        setIsFavorite(false);
      } else {
        await userAPI.addFavorite(token, { adId });
        setIsFavorite(true);
      }
    } catch {
      setPageError("Failed to update favorites.");
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  const handlePurchase = async () => {
    if (!token || !adId) {
      return;
    }

    setIsPurchasing(true);
    setPurchaseMessage("");
    setPageError("");

    try {
      await transactionAPI.purchaseAd(token, { adId });
      setAd((current) => (current ? { ...current, status: "SOLD" } : current));
      setPurchaseMessage("Kupovina je uspešno završena. Oglas je označen kao prodat.");
    } catch {
      setPageError("Kupovina nije uspela.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const formatPrice = (value: number) => `${value.toFixed(2)} RSD`;
  const isOwner = user?.id === ad?.sellerId;
  const isSold = ad?.status?.toUpperCase() === "SOLD";

  if (isLoading) {
    return (
      <section className="card">
        <p style={{ marginBottom: 0 }}>Loading ad details...</p>
      </section>
    );
  }

  if (pageError && !ad) {
    return (
      <section className="card">
        <p style={{ marginBottom: "16px" }}>{pageError}</p>
        <Link className="btn btn-standard" to="/marketplace/all">
          Nazad na oglase
        </Link>
      </section>
    );
  }

  if (!ad) {
    return (
      <section className="card">
        <p style={{ marginBottom: "16px" }}>Ad not found.</p>
        <Link className="btn btn-standard" to="/marketplace/all">
          Nazad na oglase
        </Link>
      </section>
    );
  }

  return (
    <>
      {pageError ? (
        <section className="card" style={{ marginBottom: "24px" }}>
          <p style={{ marginBottom: 0 }}>{pageError}</p>
        </section>
      ) : null}

      {purchaseMessage ? (
        <section className="card" style={{ marginBottom: "24px" }}>
          <p style={{ marginBottom: 0 }}>{purchaseMessage}</p>
        </section>
      ) : null}

      <section className="card" style={{ marginBottom: "24px" }}>
        <div className="flex justify-between gap-3" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
            <Link className="btn btn-standard" to="/marketplace/all">
              Nazad na oglase
            </Link>
            <Link className="btn btn-ghost" to="/marketplace/favorites">
              Omiljeni oglasi
            </Link>
          </div>
          <span
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--win11-divider)",
              fontSize: "12px",
              letterSpacing: "0.06em",
            }}
          >
            {ad.category?.name ?? "Marketplace ad"}
          </span>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
          gap: "24px",
          alignItems: "start",
        }}
      >
        <article className="card">
          {selectedImage ? (
            <img
              src={selectedImage}
              alt={ad.title}
              style={{
                width: "100%",
                height: "420px",
                objectFit: "cover",
                borderRadius: "16px",
                border: "1px solid var(--win11-divider)",
                marginBottom: "16px",
              }}
            />
          ) : (
            <div
              className="flex items-center justify-center"
              style={{
                height: "420px",
                borderRadius: "16px",
                border: "1px solid var(--win11-divider)",
                background: "rgba(255,255,255,0.04)",
                marginBottom: "16px",
              }}
            >
              <span style={{ color: "var(--win11-text-tertiary)" }}>No image</span>
            </div>
          )}

          {ad.imageUrls.length > 1 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
                gap: "12px",
              }}
            >
              {ad.imageUrls.map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  style={{
                    padding: 0,
                    borderRadius: "12px",
                    overflow: "hidden",
                    border:
                      index === selectedImageIndex
                        ? "2px solid var(--win11-accent)"
                        : "1px solid var(--win11-divider)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={`${ad.title} preview ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "84px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </article>

        <aside className="card">
          <p
            style={{
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--win11-text-tertiary)",
              marginBottom: "10px",
            }}
          >
            {ad.category?.name ?? "Marketplace"}
          </p>
          <h1 style={{ marginBottom: "10px" }}>{ad.title}</h1>
          <p
            style={{
              fontSize: "28px",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            {formatPrice(ad.price)}
          </p>
          <p style={{ marginBottom: "20px", lineHeight: 1.7 }}>{ad.description}</p>

          <div className="flex flex-col gap-3" style={{ marginBottom: "20px" }}>
            <div className="list-item" style={{ cursor: "default" }}>
              <div>
                <strong>Objavljen</strong>
                <p style={{ marginBottom: 0 }}>{new Date(ad.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="list-item" style={{ cursor: "default" }}>
              <div>
                <strong>Prodavac</strong>
                <p style={{ marginBottom: 0 }}>{isOwner ? "Ovo je tvoj oglas." : ad.sellerId}</p>
              </div>
            </div>
            <div className="list-item" style={{ cursor: "default" }}>
              <div>
                <strong>Status</strong>
                <p style={{ marginBottom: 0 }}>{ad.status}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              className="btn btn-standard"
              type="button"
              onClick={() => void handleToggleFavorite()}
              disabled={!token || isUpdatingFavorite}
            >
              {isFavorite ? "Ukloni iz omiljenih" : "Dodaj u omiljene"}
            </button>
            <button
              className="btn btn-accent"
              type="button"
              onClick={() => void handlePurchase()}
              disabled={!token || isOwner || isSold || isPurchasing}
            >
              {isOwner
                ? "Ovo je tvoj oglas"
                : isSold
                  ? "Oglas je prodat"
                  : isPurchasing
                    ? "Kupovina..."
                    : "Kupi odmah"}
            </button>
          </div>
        </aside>
      </section>
    </>
  );
};
