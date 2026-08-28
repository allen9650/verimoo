import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_INSTRUCTION =
  "You write short, formal wording for printed certificates (completion, appreciation, achievement, participation). " +
  "Return 3-5 distinct one-sentence options, one per line, no numbering, no quotation marks, no markdown. " +
  "Keep each under 25 words. Use placeholders literally where relevant, e.g. {Name}, {Date}, {Course}, {Organization}.";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "AI suggestions aren't configured yet — add GEMINI_API_KEY to .env.local." },
      { status: 501 }
    );
  }

  const body = await req.json();
  const prompt = (body.prompt || "").trim();
  if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });

  await connectDB();
  const admin = await Admin.findById(session.user.id);
  if (admin.aiTokenLimit !== null && admin.aiTokensUsed >= admin.aiTokenLimit) {
    return NextResponse.json(
      { error: `You've used your AI suggestion quota (${admin.aiTokenLimit} tokens). Ask a superadmin to raise it.` },
      { status: 403 }
    );
  }

  let geminiRes;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 300 },
        }),
      }
    );
  } catch {
    return NextResponse.json({ error: "Couldn't reach the Gemini API. Check network access and try again." }, { status: 502 });
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return NextResponse.json({ error: `Gemini API error (${geminiRes.status}): ${errText.slice(0, 300)}` }, { status: 502 });
  }

  const data = await geminiRes.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  const suggestions = text
    .split("\n")
    .map((line) => line.replace(/^[-*\d.]+\s*/, "").trim())
    .filter(Boolean);

  const tokensUsed = (data.usageMetadata?.totalTokenCount ?? 0) || 0;
  admin.aiTokensUsed += tokensUsed;
  await admin.save();

  return NextResponse.json({
    suggestions,
    tokensUsed,
    tokensRemaining: admin.aiTokenLimit === null ? null : Math.max(0, admin.aiTokenLimit - admin.aiTokensUsed),
  });
}
