import type { Metadata } from "next";
import { FavoritesManager } from "@/components/favorites/favorites-manager";

export const metadata: Metadata = { title: "Favoris", description: "Vos villes favorites et leurs heures, enregistrées sur cet appareil." };

export default function FavorisPage() {
  return <FavoritesManager />;
}
