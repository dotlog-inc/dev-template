/**
 * セットアップ段階の暫定トップページ。
 *
 * なぜ静的か: 本アーキテクチャ (ARCHITECTURE.md §3) では、ブラウザからBEを直接叩かず
 *   アクセスは必ずNext.jsサーバー側 (Server Component / Server Action) を経由する。
 *   実際の画面・データ取得は後続PRで追加するため、ここではBEに触れない入口だけ置く。
 * 補足: BE接続は環境変数 `BE_URL` で切り替える (未設定なら内蔵モックBE)。
 *   クライアント公開の `NEXT_PUBLIC_*` でBEのURLを撒くことはしない。
 */
export default function Home() {
  return (
    <main>
      <h1>dev-template</h1>
      <p className="muted">
        セットアップ済み。画面・データ取得は後続PRで追加します。設計は apps/web/ARCHITECTURE.md を参照。
      </p>
    </main>
  );
}
