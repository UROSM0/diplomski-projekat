import React, { useState } from "react";
import { IAuthAPI } from "../../api/auth/IAuthAPI";
import { RegistrationUserDTO } from "../../models/auth/RegistrationUserDTO";
import { useAuth } from "../../hooks/useAuthHook";
import { useNavigate } from "react-router-dom";

type RegisterFormProps = {
  authAPI: IAuthAPI;
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ authAPI }) => {
  const [formData, setFormData] = useState<RegistrationUserDTO>({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    profileImage: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password !== confirmPassword) {
      setError("Lozinke se ne poklapaju.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Lozinka mora imati najmanje 6 karaktera.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.register(formData);

      if (response.success) {
        setSuccess(response.message || "Registracija je uspesna.");

        if (response.token && response.refreshToken) {
          login(response.token, response.refreshToken);
          setTimeout(() => {
            navigate("/dashboard");
          }, 1500);
        }
      } else {
        setError(response.message || "Registracija nije uspela.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Doslo je do greske. Pokusajte ponovo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div style={{ marginBottom: "4px" }}>
        <h2 style={{ marginBottom: "8px" }}>Napravi nalog</h2>
      </div>

      <div>
        <label htmlFor="username" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
          Korisnicko ime
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Izaberite korisnicko ime"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="email" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
          Imejl
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="your.email@example.com"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="firstName" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
          Ime
        </label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          value={formData.firstName ?? ""}
          onChange={handleChange}
          placeholder="Unesite ime"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="lastName" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
          Prezime
        </label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          value={formData.lastName ?? ""}
          onChange={handleChange}
          placeholder="Unesite prezime"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
          Lozinka
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Unesite lozinku"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
          Potvrda lozinke
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setError("");
          }}
          placeholder="Ponovo unesite lozinku"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="profileImage" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
          Profilna slika <span style={{ color: "var(--win11-text-tertiary)", fontWeight: 400 }}>(opciono)</span>
        </label>
        <input
          type="url"
          id="profileImage"
          name="profileImage"
          value={formData.profileImage}
          onChange={handleChange}
          placeholder="https://example.com/avatar.jpg"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="status-banner status-banner-error">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--win11-close-hover)">
              <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 1a5 5 0 110 10A5 5 0 018 3zm0 2a.5.5 0 01.5.5v3a.5.5 0 01-1 0v-3A.5.5 0 018 5zm0 6a.75.75 0 110 1.5.75.75 0 010-1.5z"/>
            </svg>
            <span style={{ fontSize: "13px", color: "var(--win11-text-primary)" }}>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="status-banner status-banner-success">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="#107c10">
              <path d="M8 2a6 6 0 110 12A6 6 0 018 2zm2.354 4.146a.5.5 0 010 .708l-3 3a.5.5 0 01-.708 0l-1.5-1.5a.5.5 0 11.708-.708L7 8.793l2.646-2.647a.5.5 0 01.708 0z"/>
            </svg>
            <span style={{ fontSize: "13px", color: "var(--win11-text-primary)" }}>{success}</span>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-accent"
        disabled={isLoading}
        style={{ marginTop: "8px" }}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }}></div>
            <span>Kreiranje naloga...</span>
          </div>
        ) : (
          "Registracija"
        )}
      </button>
    </form>
  );
};
