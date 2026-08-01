import React, { useEffect, useState } from "react";
import { getErrorMessage } from "../api/shared/apiError";
import { IUserAPI } from "../api/users/IUserAPI";
import { DashboardNavbar } from "../components/dashboard/navbar/Navbar";
import { useAuth } from "../hooks/useAuthHook";
import { ChangePasswordDTO } from "../models/users/ChangePasswordDTO";
import { UpdateUserProfileDTO } from "../models/users/UpdateUserProfileDTO";
import { UserDTO } from "../models/users/UserDTO";

type AccountManagementPageProps = { userAPI: IUserAPI };

export const AccountManagementPage: React.FC<AccountManagementPageProps> = ({ userAPI }) => {
  const { token } = useAuth();
  const [user, setUser] = useState<UserDTO | null>(null);
  const [profileForm, setProfileForm] = useState<UpdateUserProfileDTO>({ firstName: "", lastName: "", profileImage: "" });
  const [passwordForm, setPasswordForm] = useState<ChangePasswordDTO>({ currentPassword: "", newPassword: "" });
  const [topUpAmount, setTopUpAmount] = useState("1000");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState<"profile" | "wallet" | "password" | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      try {
        const currentUser = await userAPI.getCurrentUser(token);
        setUser(currentUser);
        setProfileForm({
          firstName: currentUser.firstName ?? "",
          lastName: currentUser.lastName ?? "",
          profileImage: currentUser.profileImage ?? "",
        });
      } catch (error) {
        setMessage(getErrorMessage(error, "Ucavanje profila nije uspelo."));
      }
    };
    void loadProfile();
  }, [token, userAPI]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setIsBusy("profile"); setMessage("");
    try {
      setUser(await userAPI.updateCurrentUser(token, profileForm));
      setMessage("Profil je uspesno sacuvan.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Izmena profila nije uspela."));
    } finally { setIsBusy(null); }
  };

  const topUpWallet = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setIsBusy("wallet"); setMessage("");
    try {
      setUser(await userAPI.topUpBalance(token, { amount: Number(topUpAmount) }));
      setMessage(`Novcanik je dopunjen za ${Number(topUpAmount).toFixed(2)} RSD.`);
    } catch (error) {
      setMessage(getErrorMessage(error, "Doplata novcanika nije uspela."));
    } finally { setIsBusy(null); }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setIsBusy("password"); setMessage("");
    try {
      await userAPI.changePassword(token, passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setMessage("Lozinka je uspesno promenjena.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Promena lozinke nije uspela."));
    } finally { setIsBusy(null); }
  };

  return (
    <div className="page-shell">
      <DashboardNavbar userAPI={userAPI} activePage="account-management" />
      <main className="page-main" style={{ maxWidth: "1040px" }}>
        <section className="card page-hero page-hero-tight" style={{ marginBottom: "16px" }}>
          <div className="hero-kicker">Podesavanja</div>
          <h1>Upravljanje nalogom</h1>
          <p style={{ margin: "8px 0 0" }}>Izmeni profil, zastiti nalog ili upravljaj stanjem novcanika.</p>
        </section>

        {message ? <section className="card status-banner status-banner-success" style={{ marginBottom: "16px" }}><p style={{ margin: 0 }}>{message}</p></section> : null}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "16px" }}>
          <article className="card">
            <div className="hero-kicker">Profil</div><h2>Licni podaci</h2>
            <form onSubmit={saveProfile} className="flex flex-col gap-3">
              <input type="text" placeholder="Ime" value={profileForm.firstName ?? ""} onChange={(e) => setProfileForm((v) => ({ ...v, firstName: e.target.value }))} />
              <input type="text" placeholder="Prezime" value={profileForm.lastName ?? ""} onChange={(e) => setProfileForm((v) => ({ ...v, lastName: e.target.value }))} />
              <input type="url" placeholder="Link do profilne slike" value={profileForm.profileImage ?? ""} onChange={(e) => setProfileForm((v) => ({ ...v, profileImage: e.target.value }))} />
              <button className="btn btn-accent" type="submit" disabled={isBusy !== null}>{isBusy === "profile" ? "Cuvanje..." : "Sacuvaj profil"}</button>
            </form>
          </article>

          <article className="card">
            <div className="hero-kicker">Bezbednost</div><h2>Promena lozinke</h2>
            <form onSubmit={changePassword} className="flex flex-col gap-3">
              <input type="password" placeholder="Trenutna lozinka" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((v) => ({ ...v, currentPassword: e.target.value }))} />
              <input type="password" placeholder="Nova lozinka" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((v) => ({ ...v, newPassword: e.target.value }))} />
              <button className="btn btn-accent" type="submit" disabled={isBusy !== null}>{isBusy === "password" ? "Azuriranje..." : "Promeni lozinku"}</button>
            </form>
          </article>

          <article className="card">
            <div className="hero-kicker">Novcanik</div><h2>Dopuna stanja</h2>
            <p>Trenutno stanje: <strong>{typeof user?.balance === "number" ? `${user.balance.toFixed(2)} RSD` : "Ucavanje..."}</strong></p>
            <form onSubmit={topUpWallet} className="flex flex-col gap-3">
              <input type="number" min="1" step="0.01" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} />
              <button className="btn btn-accent" type="submit" disabled={isBusy !== null}>{isBusy === "wallet" ? "Obrada..." : "Dopuni novcanik"}</button>
            </form>
          </article>
        </section>
      </main>
    </div>
  );
};
