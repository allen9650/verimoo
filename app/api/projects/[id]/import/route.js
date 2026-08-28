import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import Participant from "@/models/Participant";
import { generateSerial } from "@/lib/certificate";
import { logActivity } from "@/lib/log";
import * as XLSX from "xlsx";

// Columns that map to built-in participant fields rather than custom text
// fields. Matching is case-insensitive.
const KNOWN_COLUMNS = new Set([
  "name",
  "email",
  "coursetitle",
  "course",
  "date",
  "serialnumber",
  "serial",
]);

function formatCellValue(value) {
  if (value instanceof Date) {
    // timeZone: "UTC" is essential here — without it this reads back
    // whatever calendar day the *server's local timezone* considers it to
    // be, which differs between a local dev machine and Vercel's
    // always-UTC serverless runtime (see toUtcMidnight below for the full
    // explanation of this class of bug).
    return value.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  }
  return value === undefined || value === null ? "" : String(value);
}

// Re-anchors any Date to UTC midnight of "the calendar day it represents as
// parsed," using its *local* getters intentionally — that's however the
// value was just interpreted by whichever process happened to run this
// code — and re-stores it in a timezone-independent way. This is the fix
// for a real, reported bug: a certificate date entered as "23" showed
// correctly on a local dev machine but as "22" once deployed to Vercel.
// Root cause: Date objects constructed via local-time-sensitive methods
// (`new Date(y, m, d)`, or parsing an unzoned string) are interpreted in
// whatever timezone the *current process* happens to be running in — a
// local dev machine is often not UTC, while Vercel's serverless functions
// always run in UTC. Reading the same stored instant back with
// timezone-dependent accessors on two different-timezone machines can
// therefore report two different calendar days. Calendar dates like a
// certificate's issue date have no meaningful time-of-day component, so
// every date in this app is normalized to UTC midnight at the point of
// construction, and read back exclusively with UTC accessors
// (see lib/dateFormat.js) — eliminating the ambiguity entirely rather than
// depending on both ends happening to agree on a timezone.
function toUtcMidnight(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

// Participant.date is stored as a real Date, so the importer needs to turn
// whatever Excel/CSV hands back into an actual Date object rather than text.
// Handles, in order: (1) real JS Date objects (from cellDates:true on a
// properly date-formatted column), (2) bare Excel serial numbers (the rare
// case of a "General"-formatted date cell), (3) manually typed DD-MM-YYYY /
// DD/MM/YYYY strings (the format this app asks users to standardize on), and
// (4) anything else JS's own Date parser can make sense of, as a last resort.
function coerceToDate(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) return toUtcMidnight(value);

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }

  const str = String(value).trim();
  const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (!Number.isNaN(date.getTime())) return date;
  }

  const generic = new Date(str);
  return Number.isNaN(generic.getTime()) ? undefined : toUtcMidnight(generic);
}

export async function POST(req, { params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  await connectDB();
  const project = await Project.findById(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  // `cellDates: true` makes SheetJS give us real JS Date objects for
  // date-formatted cells instead of raw Excel serial numbers.
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const created = [];
  const errors = [];
  // Strict (default): rows missing a name are skipped and reported.
  // Lenient (importValidation off): fill in a placeholder rather than
  // skipping, so an otherwise-usable row with one missing field still gets
  // imported.
  const strict = project.settings?.importValidation !== false;

  for (const row of rows) {
    let name = row.name || row.Name || row.NAME;
    if (!name) {
      if (strict) {
        errors.push({ row, reason: "Missing name" });
        continue;
      }
      name = "Unnamed participant";
    }
    let serialNumber = row.serialNumber || row.SerialNumber || row.serial;
    if (!serialNumber) {
      project.serialCounter += 1;
      serialNumber = generateSerial(project.serialPrefix, project.serialCounter);
    }

    // Any spreadsheet column that isn't one of the built-in fields is treated
    // as a custom text field, keyed by its own column header (e.g. a
    // "certificateId" or "department" column becomes participant.customFields
    // .certificateId / .department, ready to be placed on the template).
    const customFields = {};
    for (const [rawKey, value] of Object.entries(row)) {
      if (!KNOWN_COLUMNS.has(rawKey.toLowerCase()) && value !== "") {
        customFields[rawKey] = formatCellValue(value);
      }
    }

    try {
      const participant = await Participant.create({
        project: project._id,
        serialNumber,
        name: formatCellValue(name),
        email: row.email || row.Email || "",
        courseTitle: row.courseTitle || row.CourseTitle || row.course || "",
        date: coerceToDate(row.date || row.Date),
        customFields,
      });
      created.push(participant);
    } catch (e) {
      errors.push({ row, reason: e.code === 11000 ? `Serial number "${serialNumber}" is already in use.` : e.message });
    }
  }

  await project.save();
  await logActivity({
    project: project._id,
    admin: session.user.id,
    action: "imported_participants",
    details: `${created.length} imported, ${errors.length} failed`,
  });

  return NextResponse.json({ createdCount: created.length, errors });
}
