import { ReactNode, useState, useEffect, createContext, useRef } from "react";
import { AuthAPI } from "../api/auth/AuthAPI";
import { decodeJWT } from "../helpers/decode_jwt";
import { isTokenExpired } from "../helpers/expiration_jwt_validate";
import { readValueByKey, removeValueByKey, saveValueByKey } from "../helpers/local_storage";
import { AuthContextType } from "../types/AuthContextType";
import { AuthTokenClaimsType } from "../types/AuthTokenClaimsType";

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const authAPI = new AuthAPI();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthTokenClaimsType | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInFlight = useRef<Promise<boolean> | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = readValueByKey("authToken");
      const savedRefreshToken = readValueByKey("refreshToken");

      if (!savedToken || !savedRefreshToken) {
        setIsLoading(false);
        return;
      }

      if (!isTokenExpired(savedToken)) {
        const claims = decodeJWT(savedToken);
        if (claims) {
          setToken(savedToken);
          setRefreshToken(savedRefreshToken);
          setUser(claims);
          setIsLoading(false);
          return;
        }
      }

      setRefreshToken(savedRefreshToken);
      const refreshed = await refreshSession(savedRefreshToken);
      if (!refreshed) {
        clearSession();
      }

      setIsLoading(false);
    };

    void restoreSession();
  }, []);

  useEffect(() => {
    if (!token || !refreshToken) {
      return;
    }

    const decoded = decodeJWT(token);
    if (!decoded) {
      return;
    }

    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    const expMs = typeof payload.exp === "number" ? payload.exp * 1000 : 0;
    const timeoutMs = Math.max(expMs - Date.now() - 60_000, 5_000);

    const timer = window.setTimeout(() => {
      void refreshSession(refreshToken);
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [token, refreshToken]);

  const clearSession = () => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    removeValueByKey("authToken");
    removeValueByKey("refreshToken");
  };

  const login = (newToken: string, newRefreshToken: string) => {
    const claims = decodeJWT(newToken);

    if (claims && !isTokenExpired(newToken)) {
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(claims);
      saveValueByKey("authToken", newToken);
      saveValueByKey("refreshToken", newRefreshToken);
    } else {
      console.error("Invalid or expired token");
    }
  };

  const refreshSession = async (providedRefreshToken?: string): Promise<boolean> => {
    const tokenToUse = providedRefreshToken ?? refreshToken ?? readValueByKey("refreshToken");
    if (!tokenToUse) {
      return false;
    }

    if (refreshInFlight.current) {
      return refreshInFlight.current;
    }

    refreshInFlight.current = (async () => {
      try {
        const response = await authAPI.refresh({ refreshToken: tokenToUse });
        if (!response.success || !response.token || !response.refreshToken) {
          return false;
        }

        login(response.token, response.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight.current = null;
      }
    })();

    return refreshInFlight.current;
  };

  const logout = async () => {
    const storedRefreshToken = refreshToken ?? readValueByKey("refreshToken");

    try {
      if (storedRefreshToken) {
        await authAPI.logout({ refreshToken: storedRefreshToken });
      }
    } catch {
      // Ignore logout API errors and clear local session anyway.
    } finally {
      clearSession();
    }
  };

  const isAuthenticated = !!user && !!token;

  const value: AuthContextType = {
    user,
    token,
    refreshToken,
    login,
    logout,
    refreshSession,
    isAuthenticated,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
