import { defineConfig } from "vitest/config";

// ここが見るのは振る舞い —— 押した操作が API へ何を送り、応答をどう解釈するか。
// 見た目を固定するテストは置かない（Storybook / VRT を入れるならそちら側の仕事）。
export default defineConfig({
  test: {
    // 今のテストは DOM を使わないが、コンポーネントのテストを足したときに
    // 設定を変えずに済むよう jsdom にしてある。
    environment: "jsdom",
    // Node 25 以降は Web Storage が既定で有効で、globalThis.localStorage を jsdom より先に
    // 定義する。vitest の jsdom 環境は «既に global にある名前» を自身の allowlist の外では
    // 上書きしないので、Node の（--localstorage-file 無しでは setItem すら関数ではない）殻が
    // 残り、localStorage を触るテストが丸ごと落ちる。
    // **package.json の test スクリプトではなくここに置く。** 守りを起動コマンド側に置くと、
    // `vitest run` を直に叩く経路や IDE の連携が素通りし、「入口によって落ちたり落ちなかったり」
    // = «稀に落ちる» に化ける。
    execArgv: ["--no-experimental-webstorage"],
    // 上の守りが外れたときに、多数の assertion ではなく 1 行で原因が出るようにする
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
