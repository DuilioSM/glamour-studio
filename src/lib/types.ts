export type Category = "top" | "bottom" | "shoes" | "accessory" | "dress" | "other";

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "top", label: "Blusas", emoji: "👚" },
  { id: "bottom", label: "Pantalones", emoji: "👖" },
  { id: "dress", label: "Vestidos", emoji: "👗" },
  { id: "shoes", label: "Zapatos", emoji: "👠" },
  { id: "accessory", label: "Accesorios", emoji: "💍" },
  { id: "other", label: "Otros", emoji: "✨" },
];

export interface Garment {
  id: string;
  /** data URL (image/...) ya redimensionada */
  src: string;
  category: Category;
  name: string;
  /** true mientras se procesa una prenda importada (quitar fondo/clasificar). */
  pending?: boolean;
}

export interface LookResult {
  id: string;
  /** data URL de la imagen generada */
  src: string;
  garmentIds: string[];
  createdAt: number;
}
