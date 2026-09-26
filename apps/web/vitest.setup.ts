/**
 * `localStorage` が jsdom のものであることを、テストが 1 件でも走る前に確かめる。
 *
 * Node 25 以降は Web Storage が既定で有効で、`globalThis.localStorage` を jsdom より先に
 * 定義する。vitest の jsdom 環境は «既に global にある名前» を自身の allowlist の外では
 * 上書きしないため、Node のものがそのまま残る。`--localstorage-file` が無ければそれは
 * `setItem` すら関数ではない殻で、`window` も global を指すので `window.localStorage` まで
 * 同じ殻になる。
 *
 * これは `vitest.config.ts` の `execArgv` が防いでいる。ここに検査を置くのは、Node が
 * フラグ名を変えるなどしてその守りが外れたときに、**落ち方から原因を読めるようにする**ため。
 */
if (typeof globalThis.localStorage?.setItem !== "function") {
  throw new Error(
    "localStorage が jsdom のものではありません。" +
      "Node の Web Storage（25 以降は既定で有効）が globalThis.localStorage を先に定義すると、" +
      "vitest の jsdom 環境はそれを上書きしません。" +
      "vitest.config.ts の execArgv（--no-experimental-webstorage）が効いているか、" +
      "node が 22 系か（apps/web/mise.toml）を確かめてください。",
  );
}
