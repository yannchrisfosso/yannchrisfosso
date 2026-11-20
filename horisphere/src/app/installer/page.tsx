import type { Metadata } from "next";
import { InstallGuide } from "@/components/install/install-guide";

export const metadata: Metadata = {
  title: "Installer Horisphère",
  description: "Installer Horisphère comme application web, créer des raccourcis, et comprendre les limites des widgets.",
};

export default function InstallerPage() {
  return <InstallGuide />;
}
