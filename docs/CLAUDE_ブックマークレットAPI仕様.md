# Claude 用：ブックマークレット API 仕様

このドキュメントを Claude に読み込ませるか、会話に貼り付けてください。  
`app/api/vehicles/bookmarklet/route.ts` の仕様を要約しています。

---

## エンドポイント

- **URL**: `POST /api/vehicles/bookmarklet`
- **認証**: ヘッダー `X-GAMI-API-KEY` に API キー（環境変数 `GAMI_BOOKMARKLET_API_KEY` またはデフォルト値）
- **CORS**: `Access-Control-Allow-Origin: *` でブックマークレットからの呼び出しを許可

---

## リクエスト

- **Content-Type**: `application/json`
- **Body**: JSON。以下のいずれかのキーで送信可能（日本語キーも可）。

| 項目       | 英語キー例        | 日本語キー例   | 必須 |
|------------|-------------------|----------------|------|
| 車種名     | vehicleName       | 車名, 車種名   | 1つ以上必須* |
| 出品番号   | lotNumber         | 出品番号       | 1つ以上必須* |
| 総合評価   | overallGrade      | 総合評価点等   | 任意 |
| 画像URL    | imageUrl          | 画像URL等      | 任意 |
| 現在ページURL | url            | URL            | 1つ以上必須* |
| 価格（円） | price             | 価格           | 任意 |

\* vehicleName / lotNumber / url のうち少なくとも1つは必須。

---

## サーバー側の挙動

1. **認証**: `X-GAMI-API-KEY` が一致しない場合は 401。
2. **既存車両の判定**  
   - `url` で `vehicles.source_url` を検索 → 一致すれば既存  
   - 見つからなければ `lot_number` で検索 → 一致すれば既存  
3. **画像 (imageUrl あり)**  
   - サーバーで imageUrl を **fetch**  
   - 取得した画像を **Supabase Storage** のバケット `vehicle-images` に `{vehicleId}/main.{ext}` でアップロード  
   - DB の `vehicles.image_url` には **BDS の URL ではなく、Supabase の公開 URL** を保存  
   - 取得・アップロードに失敗した場合は image_url は更新しない（既存レコードはそのまま）
4. **既存車両**: 上記の結果で `vehicles` を update。`price` があれば `scenarios`（scenario_type: bookmarklet）を update または insert。  
   **レスポンス**: `{ success: true, vehicleId, action: "updated" }`
5. **新規車両**: `vehicles` に insert（image_url は画像アップロード成功時のみ後から update）。  
   `price` があれば `scenarios` に insert。  
   **レスポンス**: `{ success: true, vehicleId, action: "created" }`
6. **エラー**: 400（JSON 不正・必須不足）、401（認証）、500（DB/Storage エラー）。  
   いずれも `{ error: "メッセージ" }` 形式。

---

## 関連コード

- **画像取得・アップロード**: `lib/supabase/upload-vehicle-image.ts` の `fetchAndUploadVehicleImage(imageUrl, vehicleId)`  
  - 画像を fetch → 5MB 以下なら `vehicle-images` に upsert → 公開 URL を返す。  
  - バケットが無い場合は自動作成を試行。
- **ブックマークレットの作り方・コード例**: `public/bds-vehicles-bookmarklet.txt`

---

## まとめ（Claude 用）

- ブックマークレットは BDS 車両ページで実行され、`/api/vehicles/bookmarklet` に JSON を POST する。
- サーバーは vehicleName / lotNumber / url 等で既存車両を判定し、あれば update、なければ insert。
- imageUrl がある場合、**サーバーがその URL を fetch し、Supabase Storage に保存した上で、その公開 URL を DB の image_url に保存する**（BDS の URL は保存しない）。
- 返却される vehicleId を使って、クライアントは `window.open(APP_URL + '/vehicle/' + vehicleId)` で車両詳細を開ける。
