/**
 * Copy helper that works from a content-script Shadow Root.
 * `navigator.clipboard` is preferred (user-gesture); execCommand is the fallback.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.cssText =
        "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
      document.documentElement.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
