import { useEffect, useState } from "react";
import { getUser, type UserData } from "@/lib/mock-store";

export function useUser() {
  const [user, setUser] = useState<UserData | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setHydrated(true);
    const onChange = () => setUser(getUser());
    window.addEventListener("mws:user", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("mws:user", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return { user, hydrated };
}
