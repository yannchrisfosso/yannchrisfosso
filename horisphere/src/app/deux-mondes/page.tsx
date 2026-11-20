import type { Metadata } from "next";
import { DuoEditor } from "@/components/duo/duo-editor";

export const metadata: Metadata = {
  title: "Deux mondes",
  description: "Configurez votre module compact : deux villes, leurs heures, leurs dates et l'écart horaire.",
};

export default function DeuxMondesPage() {
  return <DuoEditor />;
}
