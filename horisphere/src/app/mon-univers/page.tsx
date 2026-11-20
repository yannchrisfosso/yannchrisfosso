import type { Metadata } from "next";
import { ThemeEditor } from "@/components/theme/theme-editor";

export const metadata: Metadata = {
  title: "Mon univers",
  description: "Personnalisez les couleurs, le mode clair ou sombre, les arrondis et les horloges d'Horisphère.",
};

export default function MonUniversPage() {
  return <ThemeEditor />;
}
