// Strips XSS-capable content from admin-uploaded SVG templates before they're
// stored or rendered. Uploaded SVGs are rendered both via dangerouslySetInnerHTML
// in the editor preview and re-embedded into generated certificates, so any
// <script>, event-handler attribute, or javascript: URI in an uploaded file
// would otherwise execute in an admin's (or, worse, a shared editor session's)
// browser. This is a deliberately narrow, dependency-free sanitizer targeting
// exactly those vectors — not a general-purpose HTML sanitizer.
export function sanitizeSvg(svgString) {
  if (!svgString) return svgString;
  return svgString
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/(href|xlink:href)\s*=\s*"(\s*javascript:[^"]*)"/gi, '$1="#"')
    .replace(/(href|xlink:href)\s*=\s*'(\s*javascript:[^']*)'/gi, "$1='#'");
}
