import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "@/components/compare/compare-view";

export const metadata: Metadata = {
  title: "Comparer deux villes",
  description: "Convertissez une heure entre deux villes, avec l'heure d'été, les décalages non entiers et les changements de date.",
};

export default function ComparerPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Chargement du comparateur…</p>}>
      <CompareView />
    </Suspense>
  );
}
