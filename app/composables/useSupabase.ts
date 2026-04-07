/**
 * Authentification Firebase (nom conservé useSupabase pour limiter les changements dans les vues).
 */
import { createSharedComposable } from "@vueuse/core";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  type User,
} from "firebase/auth";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

let firebaseApp: FirebaseApp | null = null;

function getClientApp(): FirebaseApp {
  if (firebaseApp) return firebaseApp;
  const config = useRuntimeConfig();
  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey || "",
    authDomain: config.public.firebaseAuthDomain || "",
    projectId: config.public.firebaseProjectId || "",
    storageBucket: config.public.firebaseStorageBucket || "",
    messagingSenderId: config.public.firebaseMessagingSenderId || "",
    appId: config.public.firebaseAppId || "",
  };
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn("Firebase client credentials missing in runtimeConfig.public");
  }
  firebaseApp = getApps().length
    ? getApps()[0]!
    : initializeApp(firebaseConfig);
  return firebaseApp;
}

function getClientAuth() {
  return getAuth(getClientApp());
}

/** Session compatible ancien code Supabase : access_token = ID token Firebase. */
export interface CompatibleSession {
  access_token: string;
  user: User;
}

const _useSupabase = () => {
  const user = useState<User | null>("firebase_user", () => null);
  const idToken = useState<string | null>("firebase_id_token", () => null);
  const authReady = useState<boolean>("firebase_auth_ready", () => false);

  const session = computed<CompatibleSession | null>(() => {
    if (!user.value || !idToken.value) return null;
    return { access_token: idToken.value, user: user.value };
  });

  async function refreshIdToken(): Promise<void> {
    const u = getClientAuth().currentUser;
    if (!u) {
      idToken.value = null;
      user.value = null;
      return;
    }
    idToken.value = await u.getIdToken();
    user.value = u;
  }

  if (import.meta.client) {
    onAuthStateChanged(getClientAuth(), async (u) => {
      user.value = u;
      if (u) {
        try {
          idToken.value = await u.getIdToken();
        } catch {
          idToken.value = null;
        }
      } else {
        idToken.value = null;
      }
      authReady.value = true;
    });
  }
  async function waitForAuthReady(timeoutMs = 1500): Promise<void> {
    if (import.meta.server || authReady.value) return;
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };

      const timer = window.setTimeout(() => {
        unsub();
        finish();
      }, timeoutMs);

      const unsub = onAuthStateChanged(getClientAuth(), () => {
        window.clearTimeout(timer);
        unsub();
        finish();
      });
    });
  }


  const supabase = null as null;

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getClientAuth(), email, password);
    await refreshIdToken();
  };

  const signOut = async () => {
    await firebaseSignOut(getClientAuth());
    user.value = null;
    idToken.value = null;
  };

  const getSession = async () => {
    await waitForAuthReady();
    const u = getClientAuth().currentUser;
    user.value = u;
    if (!u) {
      idToken.value = null;
      return null;
    }
    idToken.value = await u.getIdToken();
    return session.value;
  };

  const getCurrentUser = async () => {
    const u = getClientAuth().currentUser;
    user.value = u;
    return u;
  };

  const resetPassword = async (email: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await sendPasswordResetEmail(getClientAuth(), email, {
      url: `${origin}/login`,
      handleCodeInApp: true,
    });
  };

  const updatePassword = async (newPassword: string, oobCode?: string) => {
    const code =
      oobCode || (useRoute().query.oobCode as string | undefined);
    if (!code || typeof code !== "string") {
      throw new Error("Code de réinitialisation manquant");
    }
    await confirmPasswordReset(getClientAuth(), code, newPassword);
  };

  return {
    supabase,
    user: readonly(user),
    session,
    signIn,
    signOut,
    getCurrentUser,
    getSession,
    resetPassword,
    updatePassword,
    updateUserProfile: async (data: {
      displayName?: string;
      photoURL?: string | null;
    }) => {
      const u = getClientAuth().currentUser;
      if (!u) throw new Error("Non connecté");
      await updateProfile(u, data);
    },
  };
};

export const useSupabase = createSharedComposable(_useSupabase);
