import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Hors connexion" };

export default function HorsLignePage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-10 text-center">
      <h1 className="font-display text-4xl font-semibold">Vous êtes hors connexion</h1>
      <p className="text-text-muted">
        Cette page n&apos;a pas encore été enregistrée sur votre appareil. Les pages déjà visitées, vos favoris et vos deux mondes
        restent disponibles : les heures sont calculées localement.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="font-semibold text-primary-ink underline">Accueil</Link>
        <Link href="/favoris" className="font-semibold text-primary-ink underline">Favoris</Link>
        <Link href="/deux-mondes/vue" className="font-semibold text-primary-ink underline">Deux mondes</Link>
      </div>
    </div>
  );
}
