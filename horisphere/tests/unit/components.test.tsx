import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));

import { getLocation } from "@/lib/catalog";
import { ClockCard } from "@/components/clock/clock-card";
import { computeLocationTime } from "@/components/clock/use-location-time";
import { DuoStrip } from "@/components/duo/duo-strip";
import { SearchBox } from "@/components/search/search-box";
import { DEFAULT_DUO } from "@/lib/state/duo";
import { DEFAULT_THEME } from "@/lib/theme/tokens";

const NOW = Date.parse("2026-01-15T20:05:09Z");

describe("ClockCard", () => {
  it("affiche l'heure, la date, le décalage et l'état jour/nuit (icône + mot)", () => {
    const douala = getLocation("douala-cm")!;
    render(
      <ClockCard
        location={douala}
        info={computeLocationTime(douala, NOW, "America/Toronto")}
        settings={{ hourCycle: "h23", showSeconds: true }}
        clockStyle="cadran"
        cardStyle="degrade"
        isFavorite={false}
        onToggleFavorite={() => {}}
      />,
    );
    expect(screen.getByRole("heading", { name: /Douala/ })).toBeTruthy();
    expect(screen.getByText("21:05")).toBeTruthy();
    expect(screen.getByText(/Jeu\. 15 janv\./)).toBeTruthy();
    expect(screen.getByText(/UTC\+1/)).toBeTruthy();
    expect(screen.getByText("Nuit")).toBeTruthy();
    expect(screen.getByText(/\+6 h \/ vous/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ajouter Douala aux favoris" })).toBeTruthy();
  });
  it("respecte une couleur d'accent individuelle sans toucher au thème", () => {
    const tokyo = getLocation("tokyo-jp")!;
    const { container } = render(
      <ClockCard
        location={tokyo}
        info={computeLocationTime(tokyo, NOW, null)}
        settings={{ hourCycle: "h12", showSeconds: false }}
        clockStyle={DEFAULT_THEME.clockStyle}
        cardStyle="uni"
        override={{ accent: "#5BA4E6" }}
      />,
    );
    expect((container.firstChild as HTMLElement).style.getPropertyValue("--hs-accent")).toBe("#5BA4E6");
    expect(screen.getByText("5:05")).toBeTruthy();
    expect(screen.getByText("AM")).toBeTruthy();
  });
});

describe("DuoStrip", () => {
  it("montre les deux villes, l'écart et la date du lendemain", () => {
    render(<DuoStrip pref={{ ...DEFAULT_DUO, layoutMode: "confort" }} now={Date.parse("2026-01-15T20:00:00Z")} cycle="h23" interactive={false} />);
    expect(screen.getByRole("region", { name: "Deux mondes : Québec et Douala" })).toBeTruthy();
    expect(screen.getByText("15:00")).toBeTruthy();
    expect(screen.getByText("21:00")).toBeTruthy();
    expect(screen.getByText("+6 h")).toBeTruthy();
  });
});

describe("SearchBox", () => {
  it("combobox accessible : résultats groupés par pays et sélection au clavier", async () => {
    const onSelect = vi.fn();
    render(<SearchBox onSelect={onSelect} />);
    const box = screen.getByRole("combobox", { name: "Rechercher une ville ou un pays" });
    await userEvent.type(box, "cameroun");
    expect(screen.getByRole("group", { name: "Cameroun" })).toBeTruthy();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "yaounde-cm" }));
  });
});
