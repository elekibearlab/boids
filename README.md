[English](README.en.md) | 日本語

# Boids — 2D / 3D

Boidsアルゴリズムを使って、カラスの群れを Three.js で再現したサンプルです。\
画面上部のメニューで 2D・3D・3D GPU を切り替えて遊べます。\
YouTube チャンネル「エレキベアのデジタルラボ」で紹介しています。

- **ブラウザで触る**: 
  - [lab.elekibear.com/demos/boids/](https://lab.elekibear.com/demos/boids/)

| | | |
|---|---|---|
| ![2D](docs/images/2d.png) | ![3D](docs/images/3d.png) | ![3D GPU](docs/images/3d-gpu.png) |
| **2D** — 横から見たカラスの群れ | **3D** — ブロックで組んだカラスの群れ | **3D GPU** — WebGPUで1万羽を計算 |

## できること

- **基本ルール**
  - 分離、整列、結合
- **追加のルール**
  - 天敵から逃げる（2D はカーソル、3D はタカ）
  - ねぐらのまわりを渦を巻いて回る
- **パラメータ**
  - 3 つのルールの強さ
  - カラスの数: 2D は 50〜800 羽、3D は 100〜1600 羽
  - 飛ぶ範囲の広さ:  4段階から選べる
  - 空: 青空と夕方から選べる
- **3D GPU**
  - WebGPU の compute shader で計算し、数万羽を飛ばせる
- **その他**
  - 1 羽の見える範囲（ルールごとの距離）の表示
  - 3D はカメラを回せる。1 羽を追いかけることもできる

## 技術構成

- React 19
- TypeScript
- Vite
- Three.js
- Vitest
- Prettier

## 起動方法

**必要なもの**

- [Node.js](https://nodejs.org/) 22.12 以上

リポジトリのフォルダで、次のコマンドを実行します。

```bash
npm install
npm run dev
```

表示された URL（通常は `http://localhost:5173/`）をブラウザで開きます。

右上の「JA | EN」を押すか、URL に `?lang=en` を付けると英語で表示します。末尾を `#3d` にすると 3D、`#3d-gpu` にすると 3D GPU の画面から開きます。

3D GPU の画面は WebGPU を使います。最新の Chrome か Edge で開いてください。

## フォルダ構成

```
src/
  core/      Boids のコアロジック。まずここを読む
  data/      ルールのプリセット
  view2d/    2D の画面
  view3d/    3D の画面
  view3dgpu/ 3D GPU の画面（WebGPU）
  ui/        2D と 3D で共通の部品
  shared/    キーボード操作・言語・空の色
tests/       テストコード
```

## コードの読みどころ

Boids のロジックは `src/core/` にまとまっています。フレームワークに依存しない処理なので、ここを読むと仕組みが分かります。

1. **[`src/core/boids2d.ts`](src/core/boids2d.ts)** — 3 つのルール → 足し合わせ → 1 ステップ進める
2. **[`src/core/boids3d.ts`](src/core/boids3d.ts)** — 同じ順に並べた 3D 版。ルールの関数は 2D と一字一句同じ
3. **[`src/core/params.ts`](src/core/params.ts)** — 見える距離・強さ・速さの上限
4. **[`src/core/boids3d.wgsl`](src/core/boids3d.wgsl)** — 3D 版を GPU 用に書いたもの（WGSL）。関数の並びは `boids3d.ts` と同じ

3 つのルールは、どれも「近くの仲間を見て、力を 1 本返す」だけの関数になっています。

```ts
// 分離: 近すぎる仲間から離れる
separation(self, others, radius)  // 「自分 − 仲間」を距離² で割って平均
// 整列: 近くの仲間と同じ向きに飛ぶ
alignment(self, others, radius)   // 仲間の速度の平均 − 自分の速度
// 結合: 近くの仲間の真ん中へ向かう
cohesion(self, others, radius)    // 仲間の位置の平均 − 自分の位置
```

それぞれに強さを掛けて足したものが最終的な力（操舵力）です。\
`step` はそれを速度に足し、速さを上限と下限の間に収めてから、位置を進めます。

## 参考

- Craig W. Reynolds, "Flocks, Herds, and Schools: A Distributed Behavioral Model", *SIGGRAPH '87* (1987)

## ドキュメント

- [コードガイド](docs/code_guide.md) — 手を入れるときの決まり
