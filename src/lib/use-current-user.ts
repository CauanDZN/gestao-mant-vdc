"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/auth/roles";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  mustChangePassword: boolean;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active) setUser(data?.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { user, loading, setUser };
}
