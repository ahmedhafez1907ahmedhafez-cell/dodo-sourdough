import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebaseClient";

// بيرجع: user, loading, وdالة authedFetch اللي بتحط توكن الأدمن أوتوماتيك
export function useAdminAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }
  async function logout() {
    await signOut(auth);
  }
  async function authedFetch(url, options = {}) {
    // auth.currentUser مشترك بين كل الصفحات — أضمن من state اللي بيتأخر شوية
    const currentUser = auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : null;
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  return { user, loading, login, logout, authedFetch };
}
