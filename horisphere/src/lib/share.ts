/** Partage natif si disponible, sinon copie dans le presse-papiers. */
export async function shareOrCopy(data: { title: string; text: string; url?: string }): Promise<"shared" | "copied" | "failed"> {
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      await navigator.share(data);
      return "shared";
    }
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return "failed";
  }
  return (await copyText(data.url ? `${data.text}\n${data.url}` : data.text)) ? "copied" : "failed";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Repli pour les contextes sans API presse-papiers
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
