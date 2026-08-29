import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import Participant from "@/models/Participant";
import Project from "@/models/Project";

export async function GET() {
  const result = {
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      hasMongodbUri: !!process.env.MONGODB_URI,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      nextPublicBaseUrl: process.env.NEXT_PUBLIC_BASE_URL || null,
      hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
    },
    mongodb: "unknown",
    databaseName: null,
    stats: {
      participantsCount: 0,
      projectsCount: 0,
    },
    sharpAvailable: false,
    error: null,
  };

  // Check Sharp availability
  try {
    const sharp = (await import("sharp")).default;
    result.sharpAvailable = typeof sharp === "function";
  } catch (err) {
    result.sharpAvailable = false;
    result.sharpError = err instanceof Error ? err.message : String(err);
  }

  // Check MongoDB Connection
  try {
    await connectDB();
    result.mongodb = "connected";
    result.databaseName = mongoose.connection.name;
    result.stats.participantsCount = await Participant.countDocuments();
    result.stats.projectsCount = await Project.countDocuments();
  } catch (err) {
    result.status = "error";
    result.mongodb = "failed";
    result.error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(result, {
    status: result.status === "ok" ? 200 : 500,
    headers: {
      "Cache-Control": "no-cache, no-store",
    },
  });
}

