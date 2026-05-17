import React, { useEffect, useMemo, useRef, useState } from "react";
import { IAdAPI } from "../../api/ads/IAdAPI";
import { getErrorMessage } from "../../api/shared/apiError";
import { useAuth } from "../../hooks/useAuthHook";
import { AdDTO } from "../../models/ads/AdDTO";
import { CategoryDTO } from "../../models/ads/CategoryDTO";
import { CreateAdDTO } from "../../models/ads/CreateAdDTO";
import { CreateCategoryDTO } from "../../models/ads/CreateCategoryDTO";
import { UpdateAdDTO } from "../../models/ads/UpdateAdDTO";

type MarketplaceCreatePageProps = {
  adAPI: IAdAPI;
};

const INITIAL_CREATE_FORM = {
  title: "",
  description: "",
  price: "0",
  categoryId: "",
  imageFiles: [] as File[],
  imagePreviewUrls: [] as string[],
};

type CreateAdFormState = typeof INITIAL_CREATE_FORM;
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

export const MarketplaceCreatePage: React.FC<MarketplaceCreatePageProps> = ({ adAPI }) => {
  const { token, user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const createPreviewUrlsRef = useRef<string[]>([]);
  const editPreviewUrlsRef = useRef<Record<string, string[]>>({});

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [myAds, setMyAds] = useState<AdDTO[]>([]);
  const [createForm, setCreateForm] = useState<CreateAdFormState>(INITIAL_CREATE_FORM);
  const [categoryForm, setCategoryForm] = useState<CreateCategoryDTO>({
    name: "",
    description: "",
  });
  const [editDrafts, setEditDrafts] = useState<Record<string, EditAdFormState>>({});
  const [isLoadingMyAds, setIsLoadingMyAds] = useState(true);
  const [isCreatingAd, setIsCreatingAd] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
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
        const loadedCategories = await adAPI.getCategories();
        setCategories(loadedCategories);
        setCreateForm((current) => ({
          ...current,
          categoryId: current.categoryId || loadedCategories[0]?.id || "",
        }));
      } catch (error) {
        setPageError(getErrorMessage(error, "Ucavanje kategorija nije uspelo."));
      }
    };

    void loadCategories();
  }, [adAPI]);

  useEffect(() => {
    return () => {
      revokePreviewUrls(createPreviewUrlsRef.current);
      Object.values(editPreviewUrlsRef.current).forEach((previewUrls) => revokePreviewUrls(previewUrls));
    };
  }, []);

  useEffect(() => {
    const loadMyAds = async () => {
      if (!token) {
        return;
      }

      setIsLoadingMyAds(true);

      try {
        const response = await adAPI.getMyAds(token, {
          page: 1,
          limit: 12,
        });
        setMyAds(response.items);
        resetEditPreviewRefs();
        setEditDrafts(
          response.items.reduce<Record<string, EditAdFormState>>((accumulator, ad) => {
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

  const handleCreateImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const previewUrls = createPreviewUrls(selectedFiles);

    revokePreviewUrls(createPreviewUrlsRef.current);
    createPreviewUrlsRef.current = previewUrls;

    setCreateForm((current) => ({
      ...current,
      imageFiles: selectedFiles,
      imagePreviewUrls: previewUrls,
    }));

    event.target.value = "";
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

  const handleRemoveCreateImages = () => {
    revokePreviewUrls(createPreviewUrlsRef.current);
    createPreviewUrlsRef.current = [];
    setCreateForm((current) => ({
      ...current,
      imageFiles: [],
      imagePreviewUrls: [],
    }));
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

  const refreshMyAds = async () => {
    if (!token) return;

    const response = await adAPI.getMyAds(token, {
      page: 1,
      limit: 12,
    });

    setMyAds(response.items);
    resetEditPreviewRefs();
    setEditDrafts(
      response.items.reduce<Record<string, EditAdFormState>>((accumulator, ad) => {
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

  const handleCreateAd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setIsCreatingAd(true);
    setFeedbackMessage("");

    try {
      const payload: CreateAdDTO = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        price: Number(createForm.price),
        categoryId: createForm.categoryId,
        images: createForm.imageFiles,
      };

      await adAPI.createAd(token, payload);
      revokePreviewUrls(createPreviewUrlsRef.current);
      createPreviewUrlsRef.current = [];
      setCreateForm({
        ...INITIAL_CREATE_FORM,
        categoryId: categories[0]?.id || "",
      });
      await refreshMyAds();
      setFeedbackMessage("Ad created successfully and sent for moderation.");
    } catch (error) {
      setFeedbackMessage(getErrorMessage(error, "Kreiranje oglasa nije uspelo."));
    } finally {
      setIsCreatingAd(false);
    }
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
      setFeedbackMessage("Ad updated and moved back to moderation.");
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
      setFeedbackMessage("Ad deleted successfully.");
    } catch (error) {
      setFeedbackMessage(getErrorMessage(error, "Brisanje oglasa nije uspelo."));
    }
  };

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setIsCreatingCategory(true);
    setCategoryMessage("");

    try {
      const createdCategory = await adAPI.createCategory(token, {
        name: categoryForm.name.trim(),
        description: categoryForm.description?.trim() || "",
      });

      setCategories((current) =>
        [...current, createdCategory].sort((left, right) => left.name.localeCompare(right.name))
      );
      setCreateForm((current) => ({
        ...current,
        categoryId: current.categoryId || createdCategory.id,
      }));
      setCategoryForm({ name: "", description: "" });
      setCategoryMessage("Category created successfully.");
    } catch (error) {
      setCategoryMessage(getErrorMessage(error, "Kreiranje kategorije nije uspelo."));
    } finally {
      setIsCreatingCategory(false);
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
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <article className="card">
          <h2 style={{ marginBottom: "8px" }}>Dodaj oglas</h2>
          <p>Novi oglas ide na proveru pre nego sto postane vidljiv svima.</p>
          <form onSubmit={handleCreateAd} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Ad title"
              value={createForm.title}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
            <textarea
              placeholder="Describe what you are selling"
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="Price"
              value={createForm.price}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  price: event.target.value,
                }))
              }
            />
            <select
              value={createForm.categoryId}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  categoryId: event.target.value,
                }))
              }
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-3">
              <label htmlFor="create-ad-images" className="btn btn-standard" style={{ justifyContent: "center" }}>
                Browse images
              </label>
              <input
                id="create-ad-images"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => void handleCreateImageSelection(event)}
                style={{ display: "none" }}
              />

              {createForm.imagePreviewUrls.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {createForm.imagePreviewUrls.map((imageUrl, index) => (
                    <img
                      key={`${index}-${imageUrl.slice(0, 20)}`}
                      src={imageUrl}
                      alt={`Preview ${index + 1}`}
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
                <p style={{ marginBottom: 0 }}>No image selected yet.</p>
              )}
              {createForm.imagePreviewUrls.length ? (
                <button className="btn btn-ghost" type="button" onClick={handleRemoveCreateImages}>
                  Remove selected images
                </button>
              ) : null}
            </div>

            <button className="btn btn-accent" type="submit" disabled={isCreatingAd || !categories.length}>
              {isCreatingAd ? "Creating..." : "Create Ad"}
            </button>
          </form>
          {feedbackMessage ? <p style={{ marginTop: "12px", marginBottom: 0 }}>{feedbackMessage}</p> : null}
        </article>

        {isAdmin ? (
          <article className="card">
            <h2 style={{ marginBottom: "8px" }}>Dodaj kategoriju</h2>
            <p>Admin moze da otvara nove kategorije za buduce oglase.</p>
            <form onSubmit={handleCreateCategory} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Category name"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <textarea
                placeholder="Short category description"
                value={categoryForm.description ?? ""}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
              <button className="btn btn-standard" type="submit" disabled={isCreatingCategory}>
                {isCreatingCategory ? "Saving..." : "Create Category"}
              </button>
            </form>
            {categoryMessage ? <p style={{ marginTop: "12px", marginBottom: 0 }}>{categoryMessage}</p> : null}
          </article>
        ) : (
          <article className="card">
            <h2 style={{ marginBottom: "8px" }}>Dostupne kategorije</h2>
            <div className="flex flex-col gap-2">
              {categories.length ? (
                categories.map((category) => (
                  <div key={category.id} className="list-item" style={{ cursor: "default" }}>
                    <div>
                      <strong>{category.name}</strong>
                      <p style={{ marginBottom: 0 }}>{category.description || "No description."}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ marginBottom: 0 }}>No categories yet.</p>
              )}
            </div>
          </article>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginBottom: "8px" }}>Moji oglasi</h2>
        <p>Ovde menjas i brises svoje oglase. Svaka izmena vraca oglas na moderaciju.</p>

        {isLoadingMyAds ? (
          <p style={{ marginTop: "16px", marginBottom: 0 }}>Loading your ads...</p>
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
                        {ad.status}
                      </span>
                    </div>
                    <p style={{ marginTop: "10px" }}>
                      <strong>Category:</strong> {categoryMap[ad.categoryId] ?? ad.category?.name ?? "-"}
                    </p>
                    <p><strong>Current Price:</strong> {formatPrice(ad.price)}</p>
                    {ad.moderationNote ? (
                      <p style={{ color: "var(--win11-accent)" }}>
                        <strong>Moderation note:</strong> {ad.moderationNote}
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
                          Browse replacement images
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
                          <p style={{ marginBottom: 0 }}>No image selected for this ad.</p>
                        )}
                        <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
                          {draft.imagePreviewUrls.length ? (
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => handleClearEditSelection(ad.id)}
                            >
                              Clear replacement selection
                            </button>
                          ) : null}
                          {ad.imageUrls.length && !draft.removeExistingImages ? (
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => handleRemoveExistingImages(ad.id)}
                            >
                              Remove current images
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3" style={{ marginTop: "16px", flexWrap: "wrap" }}>
                      <button className="btn btn-accent" type="button" onClick={() => void handleUpdateAd(ad.id)}>
                        Save Changes
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={() => void handleDeleteAd(ad.id)}>
                        Delete Ad
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p style={{ marginBottom: 0 }}>You have not created any ads yet.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
};
