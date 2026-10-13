import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LoginInput, PublicUser, RegisterInput } from "@tiendadcc/utils";
import {
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type AuthResult,
} from "../logic/authApi.ts";

// Estado de sesión discriminado (RNF-11): los componentes no conocen la API.
export type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: PublicUser };

export interface AuthContextValue {
  state: AuthState;
  user: PublicUser | null;
  register: (input: RegisterInput) => Promise<AuthResult>;
  login: (input: LoginInput) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });

  const refresh = useCallback(async (): Promise<void> => {
    const user = await fetchCurrentUser();
    setState(
      user
        ? { status: "authenticated", user }
        : { status: "anonymous", user: null },
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthResult> => {
      const result = await registerRequest(input);
      if (result.ok) {
        setState({ status: "authenticated", user: result.user });
      }
      return result;
    },
    [],
  );

  const login = useCallback(
    async (input: LoginInput): Promise<AuthResult> => {
      const result = await loginRequest(input);
      if (result.ok) {
        setState({ status: "authenticated", user: result.user });
      }
      return result;
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await logoutRequest();
    setState({ status: "anonymous", user: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.user,
      register,
      login,
      logout,
      refresh,
    }),
    [state, register, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}