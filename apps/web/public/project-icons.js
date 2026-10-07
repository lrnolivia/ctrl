import { brand } from "./brand.js";
import { glyph } from "../../../packages/shared-ui/glyphs.js";
import { esc } from "./project-display.js";
const cache = new Map();
export function iconSlot(id) {
  return '<span class="project-icon" data-repo-icon="' + esc(id) + '" aria-hidden="true">' + ((id === "relay" || id === "ctrl") ? '<img src="' + brand[id] + '" alt="">' : glyph("neutral")) + '</span>';
}
export async function hydrateProjectIcons(root) {
  await Promise.all([...root.querySelectorAll("[data-repo-icon]")].map(async slot => {
    const id = slot.dataset.repoIcon;
    if(id==='ctrl'||id==='relay') return;
    if(cache.get(id)?.expires<Date.now())cache.delete(id);
    if (!cache.has(id)) cache.set(id, {expires:Date.now()+60000,promise: fetch("/api/projects/" + encodeURIComponent(id) + "/icon", { headers: { Accept: "application/json" } }).then(response => response.ok ? response.json() : null).catch(() => null)});
    const result = await cache.get(id).promise;
    const icon = result?.status === "found" && result.icon;
    if (!slot.isConnected || !icon || !/^data:image\/(?:png|svg\+xml|x-icon|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(icon.data_url || "")) return;
    const image = new Image(); image.alt = "";
    image.onload = () => { if (slot.isConnected) { slot.replaceChildren(image); slot.dataset.iconSource = icon.repository + "/" + icon.path; slot.dataset.iconSha = icon.blob_sha; } };
    image.src = icon.data_url;
    slot.title = "Icon from " + icon.repository;
  }));
}
