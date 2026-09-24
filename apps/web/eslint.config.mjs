import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

// NOTE: Next.js 16 で `next lint` は削除されたため、eslint-config-next の
// flat config を直接読む（FlatCompat 不要）。prettier は競合ルールを
// 落とすだけなので必ず最後に置く。
export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  prettier,
  globalIgnores([".next/**", "next-env.d.ts"]),
]);
