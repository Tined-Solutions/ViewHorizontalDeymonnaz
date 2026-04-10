export function normalizeComparableText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function summaryIsRedundant(summary, occupiedValues) {
  const normalizedSummary = normalizeComparableText(summary);

  if (!normalizedSummary) {
    return true;
  }

  if (occupiedValues.has(normalizedSummary)) {
    return true;
  }

  const parts = String(summary ?? "")
    .split(/·|\||,|;/)
    .map((part) => normalizeComparableText(part))
    .filter(Boolean);

  return parts.length > 0 && parts.every((part) => occupiedValues.has(part));
}

export function proceduralDelay(index, base = 0, step = 0.012) {
  const pattern = [0, 2, 1, 4, 3, 5, 7, 6];
  const safeIndex = Number.isFinite(index) ? Math.max(0, index) : 0;
  const cycle = pattern[safeIndex % pattern.length] * step;
  const wave = Math.floor(safeIndex / pattern.length) * step * 0.45;

  return base + cycle + wave;
}
