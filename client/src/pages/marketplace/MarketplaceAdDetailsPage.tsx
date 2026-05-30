import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { IAdAPI } from "../../api/ads/IAdAPI";
import { IChatAPI } from "../../api/chat/IChatAPI";
import { getErrorMessage } from "../../api/shared/apiError";
import { ITransactionAPI } from "../../api/transactions/ITransactionAPI";
import { IUserAPI } from "../../api/users/IUserAPI";
import { useAuth } from "../../hooks/useAuthHook";
import { AdDTO } from "../../models/ads/AdDTO";
import { SellerRatingDTO } from "../../models/transactions/SellerRatingDTO";
import { PublicUserDTO } from "../../models/users/PublicUserDTO";
import { formatAdStatusLabel, formatUserDisplayName } from "../../utils/userDisplay";

type MarketplaceAdDetailsPageProps = {
  adAPI: IAdAPI;
  chatAPI: IChatAPI;
  transactionAPI: ITransactionAPI;
  userAPI: IUserAPI;
};

export const MarketplaceAdDetailsPage: React.FC<MarketplaceAdDetailsPageProps> = ({
  adAPI,
  chatAPI,
  transactionAPI,
  userAPI,
}) => {
  const { adId } = useParams<{ adId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [ad, setAd] = useState<AdDTO | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [pageError, setPageError] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [seller, setSeller] = useState<PublicUserDTO | null>(null);
  const [sellerRatings, setSellerRatings] = useState<SellerRatingDTO[]>([]);
  const [isRatingsOpen, setIsRatingsOpen] = useState(false);
  const [isLoadingSellerRatings, setIsLoadingSellerRatings] = useState(false);

  useEffect(() => {
    const loadAd = async () => {
      if (!adId) {
        setPageError("Oglas nije pronadjen.");
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
        setSeller(null);

        if (user?.id !== loadedAd.sellerId) {
          try {
            setSeller(await userAPI.getPublicUserById(loadedAd.sellerId));
          } catch {
            setSeller(null);
          }
        }
      } catch (error) {
        setPageError(getErrorMessage(error, "Ucavanje detalja oglasa nije uspelo."));
      } finally {
        setIsLoading(false);
      }
    };

    void loadAd();
  }, [adAPI, adId, token, user?.id, userAPI]);

  const selectedImage = useMemo(() => {
    if (!ad?.imageUrls.length) {
      return "";
    }

    return ad.imageUrls[Math.min(selectedImageIndex, ad.imageUrls.length - 1)] ?? "";
  }, [ad, selectedImageIndex]);

  const sellerRatingAverage = useMemo(() => {
    if (!sellerRatings.length) {
      return 0;
    }

    return sellerRatings.reduce((sum, rating) => sum + rating.score, 0) / sellerRatings.length;
  }, [sellerRatings]);

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
    } catch (error) {
      setPageError(getErrorMessage(error, "Izmena omiljenih oglasa nije uspela."));
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
      setPurchaseMessage("Kupovina je uspesno zavrsena. Oglas je oznacen kao prodat.");
    } catch (error) {
      setPageError(getErrorMessage(error, "Kupovina nije uspela."));
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleStartChat = async () => {
    if (!token || !ad) {
      return;
    }

    setIsStartingChat(true);
    setPageError("");

    try {
      const conversation = await chatAPI.createOrGetConversation(token, {
        participantId: ad.sellerId,
        adId: ad.id,
        adTitle: ad.title,
      });
      navigate(`/chat/${conversation.id}`);
    } catch (error) {
      setPageError(getErrorMessage(error, "Pokretanje razgovora nije uspelo."));
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleOpenSellerRatings = async () => {
    if (!ad?.sellerId) {
      return;
    }

    setIsRatingsOpen(true);

    if (sellerRatings.length) {
      return;
    }

    setIsLoadingSellerRatings(true);

    try {
      setSellerRatings(await transactionAPI.getSellerRatings(ad.sellerId));
    } catch (error) {
      setPageError(getErrorMessage(error, "Ucavanje ocena prodavca nije uspelo."));
      setIsRatingsOpen(false);
    } finally {
      setIsLoadingSellerRatings(false);
    }
  };

  const formatPrice = (value: number) => `${value.toFixed(2)} RSD`;
  const isOwner = user?.id === ad?.sellerId;
  const isSold = ad?.status?.toUpperCase() === "SOLD";

  if (isLoading) {
    return (
      <section className="card">
        <p style={{ marginBottom: 0 }}>Ucavanje detalja oglasa...</p>
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
        <p style={{ marginBottom: "16px" }}>Oglas nije pronadjen.</p>
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
            {ad.category?.name ?? "Oglas"}
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
              <span style={{ color: "var(--win11-text-tertiary)" }}>Nema slike</span>
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
            {ad.category?.name ?? "Oglas"}
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
                <p style={{ marginBottom: 0 }}>
                  {isOwner ? "Ovo je tvoj oglas." : formatUserDisplayName(seller ?? { username: ad.sellerId })}
                </p>
              </div>
            </div>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => void handleOpenSellerRatings()}
              style={{ justifyContent: "space-between" }}
            >
              <span>Sve ocene prodavca</span>
              <span style={{ color: "var(--win11-text-tertiary)" }}>&rsaquo;</span>
            </button>
            <div className="list-item" style={{ cursor: "default" }}>
              <div>
                <strong>Status</strong>
                <p style={{ marginBottom: 0 }}>{formatAdStatusLabel(ad.status)}</p>
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
              className="btn btn-standard"
              type="button"
              onClick={() => void handleStartChat()}
              disabled={!token || isOwner || isStartingChat}
            >
              {isOwner ? "Ovo je tvoj oglas" : isStartingChat ? "Otvaranje..." : "Poruka prodavcu"}
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

      {isRatingsOpen ? (
        <div
          className="overlay"
          onClick={() => setIsRatingsOpen(false)}
          style={{ padding: "24px" }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(760px, 100%)",
              maxHeight: "82vh",
              overflowY: "auto",
              background: "var(--win11-surface-elevated)",
            }}
          >
            <div
              className="flex justify-between gap-3"
              style={{ alignItems: "center", flexWrap: "wrap", marginBottom: "18px" }}
            >
              <div>
                <div className="hero-kicker">Ocene</div>
                <h2 style={{ marginBottom: "6px" }}>Ocene prodavca</h2>
                <p style={{ marginBottom: 0 }}>
                  {sellerRatings.length
                    ? `Prosek ${sellerRatingAverage.toFixed(1)}/5 na osnovu ${sellerRatings.length} ocena.`
                    : "Prodavac jos nema nijednu ocenu."}
                </p>
              </div>
              <button className="btn btn-standard" type="button" onClick={() => setIsRatingsOpen(false)}>
                Zatvori
              </button>
            </div>

            {isLoadingSellerRatings ? (
              <p style={{ marginBottom: 0 }}>Ucavanje ocena...</p>
            ) : sellerRatings.length ? (
              <div className="flex flex-col gap-3">
                {sellerRatings.map((rating) => (
                  <article
                    key={rating.transactionId}
                    className="card"
                    style={{ background: "var(--win11-surface-subtle)", padding: "18px" }}
                  >
                    <div
                      className="flex justify-between gap-3"
                      style={{ alignItems: "flex-start", flexWrap: "wrap", marginBottom: "10px" }}
                    >
                      <div>
                        <strong>{rating.adTitle}</strong>
                        <p style={{ margin: "6px 0 0" }}>{new Date(rating.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div
                        style={{
                          padding: "6px 10px",
                          borderRadius: "999px",
                          background: "var(--win11-accent-soft)",
                          color: "var(--win11-accent-pressed)",
                          fontWeight: 700,
                        }}
                      >
                        {rating.score}/5
                      </div>
                    </div>
                    <p style={{ marginBottom: 0 }}>
                      {rating.comment?.trim() ? rating.comment : "Kupac nije ostavio komentar."}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
};
