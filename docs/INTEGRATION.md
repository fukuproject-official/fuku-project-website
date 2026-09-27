# HP管理画面と保存先

`/admin/` はSupabase Authでログインする管理画面。`data/cms.json` にはURLと公開可能なpublishable keyだけを設定しています。秘密鍵は不要です。

保存先は承認済みの `fuku-ticket-dev` 内のHP専用テーブル。既存チケットテーブル・決済処理は変更しません。

- `fuku_website_admins`: 管理者本人の行だけSELECT可能。ブラウザからの追加・変更は禁止。
- `fuku_website_drafts`: 管理者のみ読取可能。保存は認可チェック付きRPCのみ。
- `fuku_website_public`: 公開済みデータだけを一般閲覧可能。非表示メンバーは公開RPCで除外。
- `fuku_website_save`: リビジョン比較とトランザクションロックで競合する保存を拒否。
- `fuku_website_publish`: 指定リビジョンを確認して原子的に公開。
- `fuku-website-images`: 公開写真バケット。管理者だけアップロード可能。JPEG/PNG/WebP、8MB制限。既存Storageのpermissive policyによる権限拡張をrestrictive guardで防止。

`supabase/website.sql` は新しい環境に初回適用するSQLです。適用済み環境に再実行しないでください。管理者の追加は本人のAuth UUIDを確認して、信頼されたSQL Editorでのみ行います。`supabase/verify.sql` は試験変更をロールバックしてRLS・保存競合・非表示情報の除外を検証します。

ブラウザのアクセストークンはメモリだけに保持します。パスワードや秘密鍵をサイトデータ・localStorage・リポジトリへ保存しません。プレビュー用データはsessionStorageでプレビュータブに渡します。認証無しのプレビューURLだけでは下書きをサーバーから取得できません。

接続未設定時のみ、このブラウザのlocalStorage下書きで画面を試せます。公開ボタンと写真アップロードは使用不可。接続済みの場合、通信エラーを古い静的データで隠さずエラー表示します。

全サイトはルート配信を前提とします。CSPのconnect-srcは実際のSupabaseプロジェクトのみに限定。公開ページは公開テーブルのみ読み取ります。管理画面はnoindexです。

チケットは `ticket.url` から既存システムへ遷移する設計です。Stripe・QRの統合は今後の工程です。

参考: https://supabase.com/docs/guides/database/postgres/row-level-security 、 https://supabase.com/docs/guides/storage/security/access-control
