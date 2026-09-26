# FUKU PROJECT Official Website

福プロジェクト公式HPのフロントエンド初版。黒・白・グレーのエディトリアルデザイン、人数変更可能なメンバー紹介、軽量なスクロール演出。依存パッケージなしの HTML / CSS / JavaScript で動きます。

## 確認・ビルド

Node.js 22以上で実行します。`npm install` は不要です。

```sh
npm run dev
# http://127.0.0.1:4173
npm test
npm run build
npm run preview
```

ブラウザで index.html を直接開く方式ではなく、上記のローカルサーバーを使用してください。公開するのは `dist/` の中身です。

## 含まれる機能

- 固定ヘッダー、ページ内リンク、モバイルメニュー、出演オファー、SNSアイコン
- HERO、ABOUT、MIND、MEMBERS（PC4列・スマホ2列）・プロフィール／今後の活動／SNS詳細
- ACTIVITY、横スクロールGALLERYと拡大表示、YouTube、NEXT LIVE、SNS、CONTACT
- TICKET Coming Soonモーダル（設定1項目でチケットサイトへ切り替え）
- Reveal、スクロール連動の軽いパララックス・横移動、写真／ボタンhover
- OSの「視差効果を減らす」に対応、キーボード操作・Escape閉じる・フォーカス復帰
- 外部ライブラリ・WebGL・外部フォントなし。YouTubeはクリック時にのみ読込

## 素材・文章の差し替え

`data/site.json` が本文・写真・プロフィール・URLの編集元です。[編集ガイド](docs/CONTENT.md)を参照してください。初版の文章は仮コピーで、実在の活動実績・人物情報を推測して記載していません。画像は今回作成した差し替え用SVGイラストです。

**未設定：** 本人写真、メンバー名・担当・経歴、正式紹介文、活動実績、SNS URL、YouTube動画ID、ライブ日程、問い合わせ先。未設定のリンクは準備中案内を表示します。問い合わせ先を入れるまでは、実際の出演依頼の受信はできません。

## GitHubへの反映

対象: `https://github.com/fukuproject-official/fuku-project-website`

初版ソースは `main` に保存済みです。更新はこのリポジトリを取得し、変更を確認して通常のcommit / pushまたはPull Requestで反映してください。強制pushは不要です。`dist/` は生成物のためソースリポジトリには含めません。

## Cloudflare Pagesへ公開する際の設定

GitHub連携時のビルドコマンドは `npm run build`、出力先は `dist`、Node.jsは22以上。フレームワークは不要です。ビルド済みZIPの中身は静的ファイルとしても配信できます。本作業ではCloudflareへの接続・公開は行っていません。

`_headers` はCloudflare配信用のセキュリティヘッダーです。他の配信先では同等の設定を適用してください。サブディレクトリ配信にも通常ページの相対パスは対応します（404の戻り先は必要に応じて変更）。

## 将来の管理画面・チケット連携

[接続設計](docs/INTEGRATION.md)を参照。Supabase・`/admin`・Stripe決済・QR発券は初版の対象外です。公開データの読込は `src/content.js` に分離され、既存決済システムの修正なしでリンク接続できます。

改訂版ではTOPを1枚の画像、ABOUTを全幅画像とグラデーション上の白文字へ変更。游ゴシックを優先し、矢印・星・メンバー番号・斜め配置を外しています。
