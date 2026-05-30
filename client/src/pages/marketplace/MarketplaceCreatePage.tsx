import React, { useEffect, useRef, useState } from "react";
import { IAdAPI } from "../../api/ads/IAdAPI";
import { getErrorMessage } from "../../api/shared/apiError";
import { useAuth } from "../../hooks/useAuthHook";
import { CategoryDTO } from "../../models/ads/CategoryDTO";
import { CreateAdDTO } from "../../models/ads/CreateAdDTO";
import { CreateCategoryDTO } from "../../models/ads/CreateCategoryDTO";

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

const createPreviewUrls = (files: File[]): string[] => files.map((file) => URL.createObjectURL(file));

const revokePreviewUrls = (previewUrls: string[]): void => {
  previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
};

export const MarketplaceCreatePage: React.FC<MarketplaceCreatePageProps> = ({ adAPI }) => {
  const { token, user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const createPreviewUrlsRef = useRef<string[]>([]);

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [createForm, setCreateForm] = useState<CreateAdFormState>(INITIAL_CREATE_FORM);
  const [categoryForm, setCategoryForm] = useState<CreateCategoryDTO>({
    name: "",
    description: "",
  });
  const [isCreatingAd, setIsCreatingAd] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [pageError, setPageError] = useState("");

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
    };
  }, []);

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

  const handleRemoveCreateImages = () => {
    revokePreviewUrls(createPreviewUrlsRef.current);
    createPreviewUrlsRef.current = [];
    setCreateForm((current) => ({
      ...current,
      imageFiles: [],
      imagePreviewUrls: [],
    }));
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
      setFeedbackMessage("Oglas je sacuvan i poslat na moderaciju.");
    } catch (error) {
      setFeedbackMessage(getErrorMessage(error, "Kreiranje oglasa nije uspelo."));
    } finally {
      setIsCreatingAd(false);
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
      setCategoryMessage("Kategorija je uspesno kreirana.");
    } catch (error) {
      setCategoryMessage(getErrorMessage(error, "Kreiranje kategorije nije uspelo."));
    } finally {
      setIsCreatingCategory(false);
    }
  };

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
        }}
      >
        <article className="card">
          <h2 style={{ marginBottom: "8px" }}>Dodaj oglas</h2>
          <form onSubmit={handleCreateAd} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Naziv oglasa"
              value={createForm.title}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
            <textarea
              placeholder="Opis oglasa"
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
              placeholder="Cena"
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
              <option value="">Izaberi kategoriju</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-3">
              <label htmlFor="create-ad-images" className="btn btn-standard" style={{ justifyContent: "center" }}>
                Izaberi slike
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
                <p style={{ marginBottom: 0 }}>Nijedna slika jos nije izabrana.</p>
              )}
              {createForm.imagePreviewUrls.length ? (
                <button className="btn btn-ghost" type="button" onClick={handleRemoveCreateImages}>
                  Ukloni izabrane slike
                </button>
              ) : null}
            </div>

            <button className="btn btn-accent" type="submit" disabled={isCreatingAd || !categories.length}>
              {isCreatingAd ? "Kreiranje..." : "Objavi oglas"}
            </button>
          </form>
          {feedbackMessage ? <p style={{ marginTop: "12px", marginBottom: 0 }}>{feedbackMessage}</p> : null}
        </article>

        {isAdmin ? (
          <article className="card">
            <h2 style={{ marginBottom: "8px" }}>Dodaj kategoriju</h2>
            <form onSubmit={handleCreateCategory} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Naziv kategorije"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <textarea
                placeholder="Kratak opis kategorije"
                value={categoryForm.description ?? ""}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
              <button className="btn btn-standard" type="submit" disabled={isCreatingCategory}>
                {isCreatingCategory ? "Cuvanje..." : "Sacuvaj kategoriju"}
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
                      <p style={{ marginBottom: 0 }}>{category.description || "Nema opisa."}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ marginBottom: 0 }}>Jos nema kategorija.</p>
              )}
            </div>
          </article>
        )}
      </section>
    </>
  );
};
