# portfolio

堤 廉太郎のポートフォリオサイト。

## ファイルの構成

```
index.html          トップ（作品一覧）
admin.html          管理ページ（ブラウザから内容を編集）
philosophy.html     思想
profile.html        プロフィール
experiments.html    実験ノート

data/               ← 更新するときに触るのは基本ここだけ
  works.js          作品
  profile.js        プロフィール・活動歴
  experiments.js    実験ノート
  philosophy.js     思想

images/works/<作品id>/   作品の写真
assets/css/         見た目（base.css が全ページ共通、ほかはページごと）
assets/js/          動き（site.js がヘッダー・メニュー・フッター）
```

ヘッダー・メニュー・フッターは `assets/js/site.js` から全ページに入るので、
メニューを変えるときはそこの `SITE` を1か所直すだけで済みます。

---

## 管理ページ（いちばん簡単な更新方法）

公開中のサイトの `admin.html`（例: `https://ren-atomo.github.io/portfolio/admin.html`）を開くと、
作品・プロフィール・実験ノート・思想をフォームで編集できます。写真も選ぶだけで長辺2000pxに縮小してアップロードされます。
「保存して公開」を押すと GitHub に1回のコミットとして保存され、1〜2分でサイトに反映されます。

最初に一度だけ、GitHub のトークンを作って管理ページに入れる必要があります（手順は管理ページに表示されます）。

- トークンは **Fine-grained token** で、対象は `portfolio` リポジトリだけ、権限は **Contents: Read and write** だけにする
- トークンはそのブラウザの中にだけ保存されます。人の端末では「保存する」のチェックを外して使う
- トークンが漏れた・端末をなくしたときは、GitHub の Settings → Developer settings → Personal access tokens から削除する
- 管理ページ自体は誰でも開けますが、トークンがなければ何も変更できません

管理ページで保存すると `data/*.js` は決まった書式で書き出されます。手で書き換えたコメントのうち、
ファイル先頭のコメント以外は消えるので、説明を残したいときは先頭に書いてください。
管理ページで写真を外しても、`images/` の中のファイル自体は消えません。

以下は、ファイルを直接書き換えるときの方法です。

---

## 作品を追加する

1. **写真を用意する**
   長辺 2000px くらいに縮小しておく（スマホの写真そのままだと 1枚 5〜10MB あって重い）。
   [Squoosh](https://squoosh.app/) などで縮小・圧縮できます。
2. **写真をアップロードする**
   GitHub で `images/works/` を開き、「Add file → Upload files」。
   アップロード画面でファイル名の前に `新しいフォルダ名/` を付けるとフォルダが作れます
   （例: `images/works/newwork/1.jpg`）。
3. **`data/works.js` に作品を足す**
   既存の `{ ... },` のかたまりを1つコピーして、書き換えます。
   上に書いたものほどトップの前のほうに並びます。

```js
    {
        id: "newwork",
        title: "作品名",
        category: "picture",
        year: "2026",
        place: "上野",
        size: "small",
        image: "images/works/newwork/1.jpg",
        gallery: [
            "images/works/newwork/2.jpg",
            "images/works/newwork/3.jpg"
        ],
        video: "https://www.youtube.com/watch?v=xxxxxxxxxxx",
        description: `ここに説明文。

改行もそのまま反映されます。`
    },
```

| 項目 | 内容 |
|---|---|
| `id` | 作品ごとに違う名前（半角英数字とハイフン） |
| `size` | トップでの大きさ。`small`（1×1）/ `tall`（縦長 1×2）/ `big`（2×2）/ `hero`（2×3） |
| `image` | 一覧とページ上部に出るメイン画像。URL でも `images/...` でもOK |
| `gallery` | 追加の写真。なければ `[]` |
| `video` | YouTube の URL（動画IDだけでもOK）。なければ `""` |
| `place` | なければ `""` |

### トップの並び方について

作品は上から順に、4列のグリッドへ左上から並びます。
大きい作品（`big` / `hero`）の都合でできたすき間には、後ろにある小さい作品が自動で上に詰めて入るので、
穴が残るとしても一番下の行だけです。そのぶん、表示の順番は書いた順と少し前後することがあります。
スマホでは `big` と `hero` は横いっぱい、それ以外は2列で並びます。

---

## 実験ノートを追加する

`data/experiments.js` の一番上に `{ ... },` を1つ足します。

```js
    {
        date: "2026.09.24",
        title: "タイトル",
        tags: ["TouchDesigner"],
        description: "説明",
        video: "https://www.youtube.com/watch?v=xxxxxxxxxxx"
    },
```

## 活動歴を追加する

`data/profile.js` の `history` の中で、該当する時期の `events` に足します。
新しい時期（例: 大学1年）を作るときは、`{ year: ..., label: ..., events: [ ... ] },` のかたまりごとコピーします。

```js
                {
                    date: "2026.09.24",
                    title: "出来事の名前",
                    award: "〇〇賞",            // なければこの行ごと消す
                    description: "説明",
                    links: [                    // なければこの行から ] までを消す
                        { label: "表示する文字", url: "https://..." }
                    ]
                },
```

所属（`affiliation`）や SNS（`social`）も同じファイルにあります。年齢は誕生日から自動で計算されます。

## 思想ページを直す

`data/philosophy.js` の `sections` に、節ごとの見出しと本文を書きます。本文は `` ` `` と `` ` `` の間に、ふつうの文章として書けます。

- 空行で段落を分ける（段落の中の改行はそのまま改行になる）
- 「・」で始まる行だけの段落は箇条書きになる
- 「>」で始まる行だけの段落は引用（グレーの枠）になる
- `emphasis: true` にした節は、段落が太字になる

```js
        {
            heading: "見出し",
            emphasis: false,
            body: `一つ目の段落。
ここで改行。

・箇条書き1
・箇条書き2

> 引用したい文章`
        },
```

---

## 書き換えたあとに表示が真っ白・崩れたとき

data の `.js` ファイルは書き方が少し厳密です。よくある原因は次のとおりです。

- `{ ... }` と `{ ... }` のあいだの **`,`（カンマ）が抜けている**
- 文字列の `"` が閉じていない。文字列の中で `"` を使いたいときは `\"` と書く
- `description` の中で `` ` ``（バッククォート）を使っている

ブラウザで開いて F12（開発者ツール）→ Console を見ると、何行目がおかしいか表示されます。
このサイトはビルド不要なので、`index.html` をダブルクリックして開くだけで手元でも確認できます。
