import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-12 text-center">
      <p className="text-xs font-bold tracking-[0.18em] text-secondary-ink uppercase">Erreur 404</p>
      <h1 className="font-display text-4xl font-semibold">Ce lieu n&apos;existe pas (encore)</h1>
      <p className="text-text-muted">L&apos;adresse est peut-être incomplète. Recherchez la ville depuis l&apos;accueil.</p>
      <Link href="/" className="font-semibold text-primary-ink underline">Retour à l&apos;accueil</Link>
    </div>
  );
}
