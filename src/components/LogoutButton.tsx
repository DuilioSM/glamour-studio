"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCloset } from "@/lib/store";
import { GhostButton } from "@/components/ui";

export function LogoutButton() {
  const router = useRouter();
  const reset = useCloset((s) => s.reset);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push("/login");
    router.refresh();
  }

  return <GhostButton onClick={logout}>Salir</GhostButton>;
}
