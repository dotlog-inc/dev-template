import { db } from "@/lib/mock/db";

/**
 * GCSの代役(モックモード専用)。
 * PUT: 署名URLへの直接アップロードを模倣してメモリに保存
 * GET: 保存した画像を配信
 * 本番ではこのルートは使われない(署名URLが実GCSを指す)。
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = new Uint8Array(await req.arrayBuffer());
  db.files.set(id, {
    data,
    contentType: req.headers.get("Content-Type") ?? "application/octet-stream",
  });
  return new Response(null, { status: 200 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = db.files.get(id);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.data.slice().buffer, {
    headers: { "Content-Type": file.contentType, "Cache-Control": "no-store" },
  });
}
