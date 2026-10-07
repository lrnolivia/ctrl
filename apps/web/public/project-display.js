const names = {
  relay: "relay", "bazzite-custom": "loewOS", field: "field", gamebridge: "GameBridge",
  "loew-inspector": "inspector", "loew-runner": "runner", "loew-shell": "loew shell",
  loewfi: "loew.fi", loewtorials: "loewtorials", "rtxforge-mfg": "rtxForge MFG",
  rtxforge: "rtxForge", thetake: "The Take"
};

export function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}
export function projectName(id) { return names[id] || String(id || "project").replace(/[-_]+/g, " "); }
