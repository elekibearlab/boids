# コードガイド

このサンプルに手を入れるときの決まり。いちばん大事なのは **「Boids の 3 つのルールが真っ先に読める」こと**。
機能を足すより、読んで分かることを優先する。作りは game-of-life サンプルにそろえている。

## 構成

React は画面の組み立てと操作パネルだけを担当し、描画は Three.js の API を直接書く（React Three Fiber は使わない）。

```
src/
  core/                Boids のロジック。React も three も import しない。まずここを読む
    boids2d.ts          3 つのルール（分離・整列・結合）→ 足し合わせ → 1 ステップ進める
    boids3d.ts          3D 版。boids2d.ts と同じ順・同じ中身。違うのはベクトルに z があることだけ
    boids3d.wgsl        3D 版を GPU 用に書いたもの（WebGPU の compute shader）。boids3d.ts と同じ順・同じ式
    vec2.ts  vec3.ts    { x, y } / { x, y, z } と短い関数（add・sub・scale…）。式がそのまま読めるように
    params.ts           見える距離・強さ・速さの上限（2D と 3D で共通）
  data/
    presets.ts          ルールを 1 つずつ足していくプリセット 6 種（2D と 3D で共通）
  view2d/              2D の画面（横から見た空。カラスの絵 2 枚を交互に出して羽ばたかせる）
    Boids2D.tsx         入口。UI に出す state を持ち、部品を組み立てる
    types.ts            画面の中で共有する型
    components/         React の部品（PascalCase.tsx だけ）
    scene/              Three.js の描画。useBoidsScene と、React を知らない描画処理（camelCase.ts だけ）
  view3d/              3D の画面（ブロックで組んだカラス。view2d と同じ並び）
  view3dgpu/           3D GPU の画面。計算は core/boids3d.wgsl、描画も WebGPU（scene/crow.wgsl）。three はカメラと OrbitControls だけ
  ui/                  2D と 3D の両方で使う React の部品
  shared/              2D と 3D の両方で使う、部品ではない処理（言語・キーボード・空の色）
  App.tsx              タイトルと 2D / 3D のメニュー
public/textures/       カラスの絵（ゴロヤンのゲームの素材）
tests/                 Vitest。core を直接テストする
```

## 依存方向

```
core  →  data  →  view2d / view3d  →  App
          ↑             ↑
        shared  ───→   ui
```

- **view2d と view3d は直接 import し合わない**。両方で使うものは `ui/`（React の部品）か `shared/`（それ以外）に置く。
- `shared/` は three を import しない（`sky.ts` は canvas を返すだけで、テクスチャにするのは各 view）。

## コアロジックの書き方

ブログ記事「[Unity] Boids アルゴリズムで魚群をシミュレーションする」（elekibear.com/post/20240528_01_unity_boids）と同じ順・同じ考え方にしている。

- `boids2d.ts` は上から **分離 → 整列 → 結合 → 足し合わせ（`steer`）→ 追加の力 → 1 ステップ（`step`）→ 速い探し方** の順。
- **ルール 1 つ = 関数 1 つ**。どれも「自分」「見る相手」「距離」を受け取り、力のベクトルを 1 本返すだけ。
  - 分離 = 近すぎる相手との「自分 − 相手」を距離² で割って平均
  - 整列 = 相手の速度の平均 − 自分の速度
  - 結合 = 相手の位置の平均 − 自分の位置
- `step` の順はブログの IntegrateCS と同じ：操舵力 → 壁の外なら押し戻す → 速度 += 力 × dt → 速さを上下限で切る → 位置 += 速度 × dt。
- 3 つのルールに入らない力（壁・天敵・ねぐら）は、ルールの後ろに別の関数として置く。最初に読む 3 つを短く保つため。
- `boids3d.ts` は `boids2d.ts` をそのまま写し、`Area`・`createFlock`・`avoidWalls`・`createGridSearch` の z の分だけを変える。
  ルールの関数は一字一句同じにする（`tests/boids3d.test.ts` が「z = 0 なら 2D と同じ動き」を確かめている）。
- 全員と比べる `searchAll`（N²）が説明用の基準。速い `createGridSearch` は結果が同じことをテストで確かめる。
- `boids3d.wgsl` は `boids3d.ts` を GPU 用に写したもの。ルールの式を変えたら両方を直す。GPU 版は全員と比べるまま（並列なので速い）。
  GPU と CPU の結果が同じことは、ブラウザで 5 ステップ進めて比べて確かめた（差は float32 の誤差の 3×10⁻⁶ 程度）。

## 状態

- 再生中・速度・強さなど UI に出す値は、各画面（`Boids2D` / `Boids3D`）の React state に置く。
- 群れは毎フレーム変わるので React state に入れず、`useBoidsScene` の ref に持つ。描画ループも React の外で回す。
- シミュレーションは 1/60 秒の固定ステップで進める（画面の fps によって動きが変わらないように）。
- 1 フレームに回すステップは最大 2 回（`MAX_STEPS_PER_FRAME`）。遅れを全部取り戻そうとすると、重いほどさらに重くなるため。
  CPU 版は群れが固まるほど近くの仲間が増えて重くなる（400 羽で 1 ステップ 4ms → 12ms）。重いときはスローモーションになる。
- 羽数のようにシーンの作り直しが要る変更は、`BoidsCanvas` の `key` を変えて作り直す。

## 表示・見た目

- 説明用の表示（見える範囲・追いかけるカメラ・霧）はすべてオプションにし、初期値はオフにする。どれも動きには影響させない。
- 背景は青空と夕方から選ぶ（`shared/sky.ts`）。カラスが濃い灰色なので、暗い背景にはしない。
- 範囲の広さは各画面の `AREAS` で選ぶ。カラスの大きさは変えないので、広いほど小さく見える。
- 壁は外に出てから押し戻すので、少しはみ出す。2D のカメラは範囲の外側も少し映す（`createStage.ts` の `PADDING`）。
- 画面の文字の決まり（`t({ ja, en })`・`?lang=en`・iframe の中では切り替えを出さない）は game-of-life と同じ。

## 命名・コメント・書式

- 命名・JSDoc・Prettier・`if` の本体を必ず `{ }` で囲む、などは game-of-life のコードガイドと同じ。
- コード中のコメントは英語で、**なぜその形にしたか**を書く。調整用の数値は名前付き定数にしてファイル先頭に置く。

## 確認

```bash
npm run typecheck
npm test
npm run format:check
npm run build
```
