import type { Metadata } from "next";
import { SettingsHelp } from "@/components/help/settings-help";

export const metadata: Metadata = {
  title: "Réglages et aide",
  description: "Format 12/24 h, secondes, animations, données locales, confidentialité et aide d'Horisphère.",
};

export default function AidePage() {
  return <SettingsHelp />;
}
