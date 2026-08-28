// Custom font names are used directly as CSS font-family identifiers inside
// a <style> block — both server-side (embedded in generated SVG) and
// client-side (the editor preview, via dangerouslySetInnerHTML so the same
// font can be previewed before saving). An unsanitized name is a CSS/HTML
// injection vector there (e.g. a name like `foo; } </style><script>...`),
// so every custom font name is reduced to a safe, unique, alphanumeric
// identifier before it's ever used as a font-family value or stored.
export function sanitizeFontFamilyName(rawName, existingNames = []) {
  const base =
    String(rawName || "")
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "")
      .slice(0, 40) || "CustomFont";
  const prefixed = `VeriMooCustom_${base}`;
  if (!existingNames.includes(prefixed)) return prefixed;
  // Ensure uniqueness if two fonts sanitize to the same identifier.
  let suffix = 2;
  while (existingNames.includes(`${prefixed}_${suffix}`)) suffix += 1;
  return `${prefixed}_${suffix}`;
}
