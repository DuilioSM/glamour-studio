"use client";

import { create } from "zustand";
import type { Category } from "@/lib/types";
import * as data from "@/lib/data";
import type { GarmentItem, LookItem } from "@/lib/data";

interface ClosetState {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  avatar: { path: string; src: string } | null;
  garments: GarmentItem[];
  looks: LookItem[];
  selected: string[];

  load: () => Promise<void>;
  reset: () => void;

  setAvatarBlob: (blob: Blob) => Promise<void>;
  addGarment: (
    blob: Blob,
    category: Category,
    name: string,
  ) => Promise<GarmentItem>;
  setGarmentCategory: (id: string, category: Category) => Promise<void>;
  removeGarment: (id: string) => Promise<void>;

  /** Re-lista las prendas y mezcla las nuevas (p. ej. importadas por la extensión). */
  syncGarments: () => Promise<void>;
  /** Procesa prendas importadas por la extensión (quita fondo + clasifica). */
  processPending: () => Promise<void>;

  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  saveLook: (imageDataUrl: string, garmentIds: string[]) => Promise<LookItem>;
  removeLook: (id: string) => Promise<void>;
}

export const useCloset = create<ClosetState>()((set, get) => ({
  loading: false,
  loaded: false,
  error: null,
  avatar: null,
  garments: [],
  looks: [],
  selected: [],

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const [avatar, garments, looks] = await Promise.all([
        data.getAvatar(),
        data.listGarments(),
        data.listLooks(),
      ]);
      set({ avatar, garments, looks, loaded: true });
    } catch (e) {
      console.error("[closet.load]", e);
      const msg = e instanceof Error ? e.message : String(e);
      const missingTables = /schema cache|does not exist|find the table/i.test(
        msg,
      );
      set({
        loaded: true,
        error: missingTables
          ? "No encuentro tus tablas en Supabase. ¿Ya corriste supabase/schema.sql en el SQL Editor?"
          : `No se pudo cargar tu guardarropa: ${msg}`,
      });
    } finally {
      set({ loading: false });
    }
  },

  reset: () =>
    set({
      avatar: null,
      garments: [],
      looks: [],
      selected: [],
      loaded: false,
      error: null,
    }),

  setAvatarBlob: async (blob) => {
    const avatar = await data.setAvatar(blob);
    set({ avatar });
  },

  addGarment: async (blob, category, name) => {
    const g = await data.addGarment(blob, category, name);
    set((s) => ({ garments: [...s.garments, g] }));

    // Auto-clasificación en segundo plano: si entró como "other", la analizamos
    // y reacomodamos su categoría sola (sin bloquear la subida).
    if (category === "other") {
      data
        .classifyGarment(blob)
        .then((cat) => {
          if (cat && cat !== "other") {
            return get().setGarmentCategory(g.id, cat);
          }
        })
        .catch(() => {});
    }

    return g;
  },

  setGarmentCategory: async (id, category) => {
    await data.updateGarmentCategory(id, category);
    set((s) => ({
      garments: s.garments.map((g) =>
        g.id === id ? { ...g, category } : g,
      ),
    }));
  },

  removeGarment: async (id) => {
    const g = get().garments.find((x) => x.id === id);
    if (!g) return;
    await data.removeGarment(g);
    set((s) => ({
      garments: s.garments.filter((x) => x.id !== id),
      selected: s.selected.filter((x) => x !== id),
    }));
  },

  syncGarments: async () => {
    if (!get().loaded || get().loading) return;
    const fresh = await data.listGarments();
    set((s) => {
      const byId = new Map(s.garments.map((g) => [g.id, g]));
      // Mezcla por id: conserva las que no cambiaron de estado (mantiene su src
      // ya resuelta para no recargar la imagen) y trae las nuevas/actualizadas.
      const merged = fresh.map((f) => {
        const ex = byId.get(f.id);
        return ex && ex.pending === f.pending ? ex : f;
      });
      const changed =
        merged.length !== s.garments.length ||
        merged.some((g, i) => g !== s.garments[i]);
      return changed ? { garments: merged } : s;
    });
  },

  processPending: async () => {
    const pending = get().garments.filter((g) => g.pending);
    if (pending.length === 0) return;

    // Importamos las utilidades de imagen solo cuando hace falta (WASM pesado).
    const { processUploadBlob } = await import("@/lib/image");

    for (const g of pending) {
      try {
        // 1) Descargamos la imagen cruda que subió la extensión.
        const res = await fetch(g.src);
        const raw = await res.blob();
        // 2) Quitamos el fondo y redimensionamos (igual que al subir a mano).
        const processed = await processUploadBlob(raw, 900, { removeBg: true });
        // 3) Clasificamos la prenda ya recortada.
        const category = await data.classifyGarment(processed);
        // 4) Reemplazamos la imagen en Storage y limpiamos el flag.
        await data.finalizePendingGarment(g, processed, category);

        const url = URL.createObjectURL(processed);
        set((s) => ({
          garments: s.garments.map((x) =>
            x.id === g.id
              ? { ...x, pending: false, category, src: url }
              : x,
          ),
        }));
      } catch (e) {
        console.error("[closet.processPending]", g.id, e);
        // La dejamos como pending para reintentar en la próxima carga.
      }
    }
  },

  toggleSelect: (id) =>
    set((s) => {
      // Si ya estaba seleccionada -> la quitamos.
      if (s.selected.includes(id)) {
        return { selected: s.selected.filter((x) => x !== id) };
      }
      // Al seleccionar, solo puede haber UNA prenda por categoría:
      // quitamos cualquier otra seleccionada del mismo tipo.
      const cat = s.garments.find((g) => g.id === id)?.category;
      const withoutSameCat = cat
        ? s.selected.filter(
            (sid) => s.garments.find((g) => g.id === sid)?.category !== cat,
          )
        : s.selected;
      return { selected: [...withoutSameCat, id] };
    }),
  clearSelection: () => set({ selected: [] }),

  saveLook: async (imageDataUrl, garmentIds) => {
    const look = await data.addLook(imageDataUrl, garmentIds);
    set((s) => ({ looks: [look, ...s.looks] }));
    return look;
  },

  removeLook: async (id) => {
    const looks = get().looks;
    const index = looks.findIndex((x) => x.id === id);
    if (index === -1) return;
    const l = looks[index];
    // Optimista: quitamos de la UI al instante y borramos en el servidor
    // en segundo plano. Así la galería no se "cuelga" esperando la red.
    set((s) => ({ looks: s.looks.filter((x) => x.id !== id) }));
    try {
      await data.removeLook(l);
    } catch (e) {
      // Si falla el borrado, restauramos el look en su posición original.
      set((s) => {
        const next = s.looks.slice();
        next.splice(Math.min(index, next.length), 0, l);
        return { looks: next };
      });
      throw e;
    }
  },
}));
