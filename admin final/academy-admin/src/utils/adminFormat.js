// src/utils/adminFormat.js — small shared helpers for the admin pages

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function truncate(text = "", max = 60) {
  const s = String(text);
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s;
}

// Loose Mongo ObjectId check — used to decide whether a bulk-JSON field
// looks like a real id already, vs. a human-readable name to resolve.
export function looksLikeObjectId(value) {
  return typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
}

// Best-effort extraction of a YouTube video id from either a raw 11-char id
// or a full watch/share/embed URL, for the Lectures page thumbnail preview.
// Returns null if it doesn't look like YouTube at all (thumbnail is skipped).
export function youtubeThumbUrl(videoIdOrUrl = "") {
  const value = String(videoIdOrUrl).trim();
  if (!value) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return `https://img.youtube.com/vi/${value}/default.jpg`;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const match = value.match(re);
    if (match) return `https://img.youtube.com/vi/${match[1]}/default.jpg`;
  }
  return null;
}

// Resolve a "course" field in a bulk-imported record: accepts either a raw
// ObjectId, or a human-typed course title (case-insensitive match against
// the loaded course list) so bulk JSON is easier to hand-write.
export function resolveCourseId(rawValue, courses) {
  if (!rawValue) return "";
  if (looksLikeObjectId(rawValue)) return rawValue;
  const match = courses.find(
    (c) => c.title?.trim().toLowerCase() === String(rawValue).trim().toLowerCase()
  );
  return match ? match._id : "";
}
