// Pure, dependency-free date formatting shared by server routes and client
// components. Deliberately manual (not Intl-based) so the exact patterns
// requested — e.g. "12-08-2026" or "12-Aug-2026" — are guaranteed regardless
// of the server/browser's locale configuration.
//
// Every function here uses UTC construction/accessors exclusively — never
// the local-timezone equivalents (`new Date(y,m,d)`, `.getDate()`, etc).
// Certificate dates are *calendar dates* with no time-of-day meaning, so
// they must be timezone-independent: local-time handling looks correct on
// whichever machine wrote the value, but reads back wrong on any machine in
// a different timezone. This is exactly what caused a certificate showing
// "23" locally to show "22" once deployed to Vercel — local dev machines
// commonly run in a non-UTC timezone, while Vercel's serverless functions
// always run in UTC, so a date parsed/read using local-time accessors
// produces two different calendar days depending on which one touched it.

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const DATE_FORMAT_OPTIONS = [
  { value: "DD-MM-YYYY", example: "12-08-2026" },
  { value: "MM-DD-YYYY", example: "08-12-2026" },
  { value: "YYYY-MM-DD", example: "2026-08-12" },
  { value: "DD-MMM-YYYY", example: "12-Aug-2026" },
  { value: "MMMM D, YYYY", example: "August 12, 2026" },
];

export function formatDate(dateInput, format = "DD-MM-YYYY") {
  if (!dateInput) return "";
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);

  // getUTC* (not getDate/getMonth/getFullYear) — see file header.
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  const monthShort = MONTHS_SHORT[d.getUTCMonth()];
  const monthLong = MONTHS_LONG[d.getUTCMonth()];

  switch (format) {
    case "MM-DD-YYYY":
      return `${month}-${day}-${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "DD-MMM-YYYY":
      return `${day}-${monthShort}-${year}`;
    case "MMMM D, YYYY":
      return `${monthLong} ${d.getUTCDate()}, ${year}`;
    case "DD-MM-YYYY":
    default:
      return `${day}-${month}-${year}`;
  }
}

// Converts a value from an <input type="date"> (always "YYYY-MM-DD") into a
// real Date object for storage. The "Z" suffix is essential — without it,
// this is parsed in the server process's local timezone (see file header).
export function parseDateInputValue(value) {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Converts a stored Date (or ISO string, as it comes back from JSON) into the
// "YYYY-MM-DD" shape an <input type="date"> expects as its value.
export function toDateInputValue(dateInput) {
  if (!dateInput) return "";
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
