import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Participant from "@/models/Participant";
import Project from "@/models/Project";
import { formatDate } from "@/lib/dateFormat";
import { isRateLimited, getClientKey } from "@/lib/rateLimit";

export async function GET(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawSerial = resolvedParams?.serial || "";
    const serial = decodeURIComponent(rawSerial).trim();

    if (!serial) {
      return NextResponse.json({ valid: false, message: "Serial number is required." }, { status: 400 });
    }

    // Public rate limit
    if (isRateLimited(`verify:${getClientKey(req)}`, 120)) {
      return NextResponse.json(
        { valid: false, message: "Too many requests. Please slow down and try again shortly." },
        { status: 429 }
      );
    }

    await connectDB();

    // Case-insensitive lookup with regex escaping
    const safeRegex = new RegExp(`^${serial.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i");
    let participant = await Participant.findOne({ serialNumber: safeRegex });

    if (!participant) {
      participant = await Participant.findOne({ serialNumber: serial });
    }

    if (!participant) {
      return NextResponse.json(
        { valid: false, message: "No certificate found with this serial number." },
        { status: 404 }
      );
    }

    const project = await Project.findById(participant.project).populate("createdBy", "name email");
    const settings = project?.settings || {};

    if (settings.certificateVerificationPage === false) {
      return NextResponse.json(
        { valid: false, message: "Public verification is turned off for this certificate's project." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      serialNumber: participant.serialNumber,
      name: participant.name,
      courseTitle: participant.courseTitle,
      date: formatDate(participant.date, project?.dateFormat),
      projectName: project?.name,
      organizationName: settings.locationTracking !== false ? project?.organizationName : undefined,
      logoUrl: settings.logoDisplay !== false ? project?.branding?.logoUrl : undefined,
      verificationTemplate: settings.verificationTemplates !== false ? project?.verificationTemplate : undefined,
      footer: settings.verificationFooter !== false ? project?.footer : undefined,
      creator:
        settings.creatorInfo !== false && project?.createdBy
          ? { name: project.createdBy.name, email: project.createdBy.email }
          : undefined,
    });
  } catch (err) {
    console.error("Verification API Route Error:", err);
    return NextResponse.json(
      { valid: false, message: "Failed to verify certificate due to a server error. Please try again." },
      { status: 500 }
    );
  }
}
