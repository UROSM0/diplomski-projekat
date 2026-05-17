import React, { useState } from "react";
import { IAuthAPI } from "../api/auth/IAuthAPI";
import { LoginForm } from "../components/auth/LoginForm";
import { RegisterForm } from "../components/auth/RegisterForm";

type AuthPageProps = {
  authAPI: IAuthAPI;
};

export const AuthPage: React.FC<AuthPageProps> = ({ authAPI }) => {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  return (
    <div className="overlay-blur-none">
      <div className="window auth-shell">
        <div className="auth-panel">
          <section className="auth-side">
            <div className="hero-kicker">Oglasnik</div>
            <h1 style={{ maxWidth: "10ch", marginBottom: "14px" }}>Kupuj i prodaj na jednom mestu.</h1>
          </section>

          <section className="auth-form-panel">
        <div className="titlebar">
          <div className="titlebar-icon">
            <img style={{marginTop: -5 }} src='/icon.png' width="20" height="20" />
          </div>
          <span className="titlebar-title">Oglasnik</span>
        </div>

        <div className="window-content" style={{ padding: 0 }}>
          <div className="auth-tab-row">
            <button
              className={activeTab === "login" ? "btn auth-tab-button auth-tab-button-active" : "btn auth-tab-button"}
              onClick={() => setActiveTab("login")}
            >
              Prijava
            </button>
            <button
              className={activeTab === "register" ? "btn auth-tab-button auth-tab-button-active" : "btn auth-tab-button"}
              onClick={() => setActiveTab("register")}
            >
              Registracija
            </button>
          </div>

          <div style={{ padding: "28px 24px 24px" }}>
            {activeTab === "login" ? (
              <LoginForm authAPI={authAPI} />
            ) : (
              <RegisterForm authAPI={authAPI} />
            )}
          </div>
        </div>
          </section>
        </div>
      </div>
    </div>
  );
};
