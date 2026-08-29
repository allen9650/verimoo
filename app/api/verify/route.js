import { GET as getVerify } from "./[serial]/route.js";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const serial = (searchParams.get("serial") || searchParams.get("s") || "").trim();
  return getVerify(req, { params: Promise.resolve({ serial }) });
}
