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

  toggleSelect: (id) =>
    set((s) => ({
      selected: s.selected.includes(id)
        ? s.selected.filter((x) => x !== id)
        : [...s.selected, id],
    })),
  clearSelection: () => set({ selected: [] }),

  saveLook: async (imageDataUrl, garmentIds) => {
    const look = await data.addLook(imageDataUrl, garmentIds);
    set((s) => ({ looks: [look, ...s.looks] }));
    return look;
  },

  removeLook: async (id) => {
    const l = get().looks.find((x) => x.id === id);
    if (!l) return;
    await data.removeLook(l);
    set((s) => ({ looks: s.looks.filter((x) => x.id !== id) }));
  },
}));
