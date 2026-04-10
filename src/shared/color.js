export function normalizeHexColor(value, fallback = "#78b0d8") {
  const text = String(value || "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text) ? text : fallback;
}

export function hexToRgbString(hex, fallback = "120, 176, 216") {
  const normalized = normalizeHexColor(hex, "#78b0d8").replace(/^#/, "");
  const expanded = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;
  const parsed = Number.parseInt(expanded, 16);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const red = (parsed >> 16) & 255;
  const green = (parsed >> 8) & 255;
  const blue = parsed & 255;
  return `${red}, ${green}, ${blue}`;
}
