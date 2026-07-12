"use client";

import { useAuth } from "./providers";

export function LogoutButton() {
  const { session, signOut } = useAuth();
  if (!session) return null;
  return (
    <button
      onClick={signOut}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-red-400 hover:text-red-600"
      title={session.user.email ?? "Sign out"}
    >
      Sign out
    </button>
  );
}
