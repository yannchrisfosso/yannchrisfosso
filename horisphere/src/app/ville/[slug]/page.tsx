import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allLocationIds, countryName, getLocation } from "@/lib/catalog";
import { CityDetail } from "@/components/city/city-detail";

export const dynamicParams = false;

export function generateStaticParams() {
  return allLocationIds().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/ville/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const loc = getLocation(slug);
  if (!loc) return {};
  const country = countryName(loc.cc);
  return {
    title: `Heure à ${loc.city}, ${country}`,
    description: `Heure et date exactes à ${loc.city} (${country}), fuseau ${loc.tz}, décalage UTC, jour ou nuit, et écart avec votre heure.`,
    alternates: { canonical: `/ville/${loc.id}` },
  };
}

export default async function CityPage({ params }: PageProps<"/ville/[slug]">) {
  const { slug } = await params;
  if (!getLocation(slug)) notFound();
  return <CityDetail id={slug} />;
}
