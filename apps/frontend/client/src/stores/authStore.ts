import { useMemo } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { LoginInput, PublicUser, RegisterInput } from "@tiendadcc/utils";
import {
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type AuthResult,
  type LoginResult,
} from "../logic/authApi.ts";
import { verifyMfaLogin } from "../logic/mfaApi.ts";

// Estado de sesión discriminado (RNF-11): los componentes no conocen la API.
export type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: PublicUser };

interface AuthStore {
  state: AuthState;
  refresh: () => Promise<void>;
  register: (input: RegisterInput) => Promise<AuthResult>;
  login: (input: LoginInput) => Promise<LoginResult>;
  verifyMfa: (challengeId: string, code: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

export interface AuthContextValue {
  state: AuthState;
  user: PublicUser | null;
  register: (input: RegisterInput) => Promise<AuthResult>;
  login: (input: LoginInput) => Promise<LoginResult>;
  verifyMfa: (challengeId: string, code: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const INITIAL_AUTH_STATE: AuthState = { status: "loading", user: null };

// Store de sesión (spec 015, RF-1). La restauración al cargar la dispara
// <SessionSync /> llamando a `refresh()` una vez.
export const useAuthStore = create<AuthStore>()((set) => ({
  state: INITIAL_AUTH_STATE,

  refresh: async () => {
    const user = await fetchCurrentUser();
    set({
      state: user
        ? { status: "authenticated", user }
        : { status: "anonymous", user: null },
    });
  },

  register: async (input) => {
    const result = await registerRequest(input);
    if (result.ok) {
      set({ state: { status: "authenticated", user: result.user } });
    }
    return result;
  },

  login: async (input) => {
    const result = await loginRequest(input);
    if (result.ok) {
      set({ state: { status: "authenticated", user: result.user } });
    }
    return result;
  },

  verifyMfa: async (challengeId, code) => {
    const result = await verifyMfaLogin(challengeId, code);
    if (result.ok) {
      set({ state: { status: "authenticated", user: result.user } });
    }
    return result;
  },

  logout: async () => {
    await logoutRequest();
    set({ state: { status: "anonymous", user: null } });
  },
}));

// Vuelve al estado inicial (antes de restaurar la sesión); lo usan los tests.
export function resetAuthStore(): void {
  useAuthStore.setState({ state: INITIAL_AUTH_STATE });
}

// API de consumo compatible con el antiguo AuthContext (spec 015, RF-4).
export function useAuth(): AuthContextValue {
  const { state, register, login, verifyMfa, logout, refresh } = useAuthStore(
    useShallow((store) => ({
      state: store.state,
      register: store.register,
      login: store.login,
      verifyMfa: store.verifyMfa,
      logout: store.logout,
      refresh: store.refresh,
    })),
  );
  return useMemo(
    () => ({
      state,
      user: state.user,
      register,
      login,
      verifyMfa,
      logout,
      refresh,
    }),
    [state, register, login, verifyMfa, logout, refresh],
  );
}
