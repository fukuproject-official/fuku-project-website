# 編集ガイド

`data/site.json` を編集 → `npm test` → `npm run build` → 公開、の順です。現時点では管理画面はありません。JSONのカンマ、二重引用符、括弧を保持してください。

| 掲載箇所 | 編集項目 |
|---|---|
| HERO | `site.heroCopy`（行ごとの配列）、`site.heroLabel`、`site.heroImage / heroImageAlt` |
| ABOUT | `about.title / lead / body / image / imageAlt` |
| 想い | `mind.title / message / body / image` |
| メンバー | `members[]` の name / part / bio / image / imageAlt |
| 今後の活動 | `members[].upcomingActivities[]` に title / date / description / url |
| 個人SNS | `members[].socials` の instagram / x / youtube / website |
| 活動情報 | `activity[]` の category / title / body / image / status |
| ギャラリー | `gallery[]` の image / alt / caption / placeholder |
| 動画 | `youtube.videoId` に11文字の動画ID、title / poster |
| NEXT LIVE | `nextLive.title / date / venue / description` |
| 公式SNS | `socials.instagram / x / youtube` |
| 出演オファー | `contact.formUrl` または `contact.email`、categories / message |
| チケット | `ticket.url` |

外部URLは `https://` から始まる完全なURLを指定。未提供は文字列の`"null"`ではなく、値の`null`にします。問い合わせはformUrlが優先され、メールの場合は相談カテゴリを件名に入れたメールアプリが開きます。サイト内からメール送信・保存は行いません。

今後の活動の例（実際の情報へ置き換えてください）：

```json
{"title":"活動タイトル","description":"活動紹介文","url":"https://example.com/"}
```

写真は `assets/` に置き、`"image": "assets/member-01.webp"` のように指定。本人写真が入ったら `placeholder` を `false` にします。推奨はポートレート縦長1000×1300px、ライブ横長1600×1000pxのWebP/JPEGです。圧縮して1枚200KB程度を目安にしてください。`imageAlt`・`alt`も写真内容に合わせて変更します。

本番素材が揃ったら、`index.html` の「VISUAL PREVIEW」「PORTRAITS & PROFILES — COMING SOON」「PHOTO ARCHIVE — COMING SOON」と動画画像altなどの仮表示も更新してください。ページの固定見出し・ラベルは `index.html`、見た目は `src/style.css` です。`site.description`の変更時は検索向けの`index.html`のdescription/OGも揃えます。

実URL・画像が確定後、OG画像の絶対URL、canonical URL、サイトマップは公開ドメインに合わせて追加してください。初版は不明な公開URLや写真を埋めていません。

## メンバーの入れ替え・人数変更

人数の上限や8人固定の制約はありません。`members`配列の項目を追加・削除すると一覧も変わります。一時的に掲載を止める場合は`published: false`、再掲載は`true`にします。`sortOrder`の小さい順に並びます。`id`は名前や順番と独立した識別子なので、既存の人を並べ替えても変更しないでください。新しい人には新しいidを付けます。

PC・タブレットは4列、スマホは読みやすい2列です。最後の行が4人未満でも空のカードは作りません。公開メンバー0人なら準備中表示になります。写真内の番号・画面のメンバー番号はありません。

TOPは`site.heroImage`の1枚画像、ABOUTは`about.image`の1枚画像に右方向の暗いグラデーションと白文字を重ねます。スマホでは文字の読みやすさを優先して下方向のグラデーションになります。

## OFFERフォームとSNS（改訂）

ヘッダー右端のOFFERはCONTACTのフォームへ移動します。名前・メール・相談種別・団体名・開催予定日・本文を入力可能。`contact.email`を設定すると、入力内容を含むメールを作成できます（利用者がメールアプリで送信）。未設定時は受付準備中で、入力内容を送信・保存しません。`contact.formUrl`を設定するとローカル入力フォームに代えて専用フォームへのリンクを表示します。サーバー送信型フォームは別途接続が必要です。

SNSの実URLは`socials`の3項目に設定。ヘッダーとFOLLOW USのロゴアイコンに共通反映します。大きな英字はImpactを優先し、日本語は游ゴシックです。Impact未搭載の端末では指定フォールバックを使います。フォントファイルの再配布はしていません。
