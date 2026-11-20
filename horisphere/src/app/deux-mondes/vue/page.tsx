import type { Metadata } from "next";
import { DuoCompactView } from "@/components/duo/duo-compact-view";

export const metadata: Metadata = { title: "Mes deux mondes", description: "Vue compacte de vos deux villes essentielles." };

export default function DuoVuePage() {
  return <DuoCompactView />;
}
