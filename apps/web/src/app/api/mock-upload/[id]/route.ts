import { db } from "@/lib/mock/db";

/**
 * GCSの代役(モックモード専用のRoute Handler)。
 *
 * なぜ存在するか: 署名URL方式の宛先として、HTTPの PUT/GET を受ける実体が要るため(§9,§10)。
 *   PUT=署名URLへの直接アップロードを模倣しメモリ保存 / GET=保存画像を配信。
 * なぜRoute Handlerか: ブラウザが直接叩くHTTPエンドポイントが必要な数少ない正当ケース(§9)。
 * 背景: 本番ではこのルートは使われない(署名URLが実GCSを指す)。モック削除時に一緒に消せる(§16-8)。
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
