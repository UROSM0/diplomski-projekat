import React, { useEffect, useMemo, useRef, useState } from "react";
import { IAdAPI } from "../../api/ads/IAdAPI";
import { getErrorMessage } from "../../api/shared/apiError";
import { useAuth } from "../../hooks/useAuthHook";
import { AdDTO } from "../../models/ads/AdDTO";
import { CategoryDTO } from "../../models/ads/CategoryDTO";
import { UpdateAdDTO } from "../../models/ads/UpdateAdDTO";
import { formatAdStatusLabel } from "../../utils/userDisplay";

type MarketplaceMyAdsPageProps = {
  adAPI: IAdAPI;
};

type EditAdFormState = {
  title: string;
  description: string;
  price: string;
  categoryId: string;
  imageFiles: File[];
  imagePreviewUrls: string[];
  removeExistingImages: boolean;
};

const createPreviewUrls = (files: File[]): string[] => files.map((file) => URL.createObjectURL(file));

const revokePreviewUrls = (previewUrls: string[]): void => {
  previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
};

export const MarketplaceMyAdsPage: React.FC<MarketplaceMyAdsPageProps> = ({ adAPI }) => {
  const { token } = useAuth();
  const editPreviewUrlsRef = useRef<Record<string, string[]>>({});

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [myAds, setMyAds] = useState<AdDTO[]>([]);
  const [editDrafts, setEditDrafts] = useState<Record<string, EditAdFormState>>({});
  const [isLoadingMyAds, setIsLoadingMyAds] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [pageError, setPageError] = useState("");

  const resetEditPreviewRefs = () => {
    Object.values(editPreviewUrlsRef.current).forEach((previewUrls) => revokePreviewUrls(previewUrls));
    editPreviewUrlsRef.current = {};
  };

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
    return () => {
      Object.values(editPreviewUrlsRef.current).forEach((previewUrls) => revokePreviewUrls(previewUrls));
    };
  }, []);

  const hydrateDrafts = (ads: AdDTO[]) => {
    setEditDrafts(
      ads.reduce<Record<string, EditAdFormState>>((accumulator, ad) => {
        accumulator[ad.id] = {
          title: ad.title,
          description: ad.description,
          price: ad.price.toString(),
          categoryId: ad.categoryId,
          imageFiles: [],
          imagePreviewUrls: [],
          removeExistingImages: false,
        };
        return accumulator;
      }, {})
    );
  };

  const refreshMyAds = async () => {
    if (!token) return;

    const response = await adAPI.getMyAds(token, {
      page: 1,
      limit: 12,
    });

    setMyAds(response.items);
    resetEditPreviewRefs();
    hydrateDrafts(response.items);
  };

  useEffect(() => {
    const loadMyAds = async () => {
      if (!token) {
        setMyAds([]);
        setIsLoadingMyAds(false);
        return;
      }

      setIsLoadingMyAds(true);
      setPageError("");

      try {
        const response = await adAPI.getMyAds(token, {
          page: 1,
          limit: 12,
        });
        setMyAds(response.items);
        resetEditPreviewRefs();
        hydrateDrafts(response.items);
      } catch (error) {
        setPageError(getErrorMessage(error, "Ucavanje vasih oglasa nije uspelo."));
      } finally {
        setIsLoadingMyAds(false);
      }
    };

    void loadMyAds();
  }, [adAPI, token]);

  const updateEditDraft = (adId: string, updates: Partial<EditAdFormState>) => {
    setEditDrafts((current) => ({
      ...current,
      [adId]: {
        ...(current[adId] ?? {
          title: "",
          description: "",
          price: "0",
          categoryId: "",
          imageFiles: [],
          imagePreviewUrls: [],
          removeExistingImages: false,
        }),
        ...updates,
      },
    }));
  };

  const handleEditImageSelection = (adId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const previewUrls = createPreviewUrls(selectedFiles);

    revokePreviewUrls(editPreviewUrlsRef.current[adId] ?? []);
    editPreviewUrlsRef.current[adId] = previewUrls;

    updateEditDraft(adId, {
      imageFiles: selectedFiles,
      imagePreviewUrls: previewUrls,
      removeExistingImages: false,
    });

    event.target.value = "";
  };

  const handleClearEditSelection = (adId: string) => {
    revokePreviewUrls(editPreviewUrlsRef.current[adId] ?? []);
    editPreviewUrlsRef.current[adId] = [];
    updateEditDraft(adId, {
      imageFiles: [],
      imagePreviewUrls: [],
    });
  };

  const handleRemoveExistingImages = (adId: string) => {
    handleClearEditSelection(adId);
    updateEditDraft(adId, {
      removeExistingImages: true,
    });
  };

  const handleUpdateAd = async (adId: string) => {
    if (!token) return;

    setFeedbackMessage("");

    try {
      const draft = editDrafts[adId];
      const payload: UpdateAdDTO = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        price: Number(draft.price),
        categoryId: draft.categoryId,
        images: draft.imageFiles,
        removeExistingImages: draft.removeExistingImages,
      };

      await adAPI.updateAd(token, adId, payload);
      await refreshMyAds();
      setFeedbackMessage("Oglas je izmenjen i vracen na moderaciju.");
    } catch (error) {
      setFeedbackMessage(getErrorMessage(error, "Izmena oglasa nije uspela."));
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!token) return;

    setFeedbackMessage("");

    try {
      await adAPI.deleteAd(token, adId);
      await refreshMyAds();
      setFeedbackMessage("Oglas je uspesno obrisan.");
    } catch (error) {
      setFeedbackMessage(getErrorMessage(error, "Brisanje oglasa nije uspelo."));
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

      {feedbackMessage ? (
        <section className="card" style={{ marginBottom: "24px" }}>
          <p style={{ marginBottom: 0 }}>{feedbackMessage}</p>
        </section>
      ) : null}

      <section className="card">
        <h2 style={{ marginBottom: "8px" }}>Moji oglasi</h2>

        {isLoadingMyAds ? (
          <p style={{ marginTop: "16px", marginBottom: 0 }}>Ucavanje vasih oglasa...</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            {myAds.length ? (
              myAds.map((ad) => {
                const draft = editDrafts[ad.id] ?? {
                  title: ad.title,
                  description: ad.description,
                  price: ad.price.toString(),
                  categoryId: ad.categoryId,
                  imageFiles: [],
                  imagePreviewUrls: [],
                  removeExistingImages: false,
                };

                const draftImages = draft.imagePreviewUrls.length
                  ? draft.imagePreviewUrls
                  : draft.removeExistingImages
                    ? []
                    : ad.imageUrls;

                return (
                  <article key={ad.id} className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="flex justify-between gap-3" style={{ alignItems: "center", flexWrap: "wrap" }}>
                      <h3 style={{ marginBottom: 0 }}>{ad.title}</h3>
                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: "999px",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid var(--win11-divider)",
                          fontSize: "12px",
                        }}
                      >
                        {formatAdStatusLabel(ad.status)}
                      </span>
                    </div>
                    <p style={{ marginTop: "10px" }}>
                      <strong>Kategorija:</strong> {categoryMap[ad.categoryId] ?? ad.category?.name ?? "-"}
                    </p>
                    <p><strong>Trenutna cena:</strong> {formatPrice(ad.price)}</p>
                    {ad.moderationNote ? (
                      <p style={{ color: "var(--win11-accent)" }}>
                        <strong>Napomena moderatora:</strong> {ad.moderationNote}
                      </p>
                    ) : null}
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(event) => updateEditDraft(ad.id, { title: event.target.value })}
                      />
                      <textarea
                        value={draft.description}
                        onChange={(event) => updateEditDraft(ad.id, { description: event.target.value })}
                      />
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={draft.price}
                        onChange={(event) => updateEditDraft(ad.id, { price: event.target.value })}
                      />
                      <select
                        value={draft.categoryId}
                        onChange={(event) => updateEditDraft(ad.id, { categoryId: event.target.value })}
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>

                      <div className="flex flex-col gap-3">
                        <label
                          htmlFor={`edit-ad-images-${ad.id}`}
                          className="btn btn-standard"
                          style={{ justifyContent: "center" }}
                        >
                          Izaberi nove slike
                        </label>
                        <input
                          id={`edit-ad-images-${ad.id}`}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => void handleEditImageSelection(ad.id, event)}
                          style={{ display: "none" }}
                        />

                        {draftImages.length ? (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                              gap: "12px",
                            }}
                          >
                            {draftImages.map((imageUrl, index) => (
                              <img
                                key={`${ad.id}-${index}-${imageUrl.slice(0, 20)}`}
                                src={imageUrl}
                                alt={`Ad preview ${index + 1}`}
                                style={{
                                  width: "100%",
                                  height: "110px",
                                  objectFit: "cover",
                                  borderRadius: "10px",
                                  border: "1px solid var(--win11-divider)",
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <p style={{ marginBottom: 0 }}>Za ovaj oglas nema izabranih slika.</p>
                        )}
                        <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
                          {draft.imagePreviewUrls.length ? (
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => handleClearEditSelection(ad.id)}
                            >
                              Ponisti izbor novih slika
                            </button>
                          ) : null}
                          {ad.imageUrls.length && !draft.removeExistingImages ? (
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => handleRemoveExistingImages(ad.id)}
                            >
                              Ukloni trenutne slike
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3" style={{ marginTop: "16px", flexWrap: "wrap" }}>
                      <button className="btn btn-accent" type="button" onClick={() => void handleUpdateAd(ad.id)}>
                        Sacuvaj izmene
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={() => void handleDeleteAd(ad.id)}>
                        Obrisi oglas
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p style={{ marginBottom: 0 }}>Jos niste kreirali nijedan oglas.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
};
