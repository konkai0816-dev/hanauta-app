# システム設計書

## 1. システム構成

```
[ブラウザ]
  │  Web Audio API で録音（WebM/WAV形式）
  │  fetch() で音声データをPOST
  ▼
[バックエンド: FastAPI (Python)]
  │  音声データを受け取る
  │  ACRCloud APIへリクエスト送信
  │  レスポンスを整形
  ▼
[ACRCloud API]
  │  音声解析・曲マッチング
  └  JSON形式で結果を返す（曲名・アーティスト・信頼度など）
```

---

## 2. API設計

### 2.1 POST /recognize

鼻歌音声を受け取り、曲認識結果を返す。

**リクエスト**
```
Content-Type: multipart/form-data
Body:
  - audio: 音声ファイル（WAVまたはWebM形式）
```

**レスポンス（成功時）**
```json
{
  "status": "success",
  "results": [
    {
      "rank": 1,
      "title": "曲名",
      "artist": "アーティスト名",
      "album": "アルバム名",
      "score": 90
    },
    {
      "rank": 2,
      "title": "曲名",
      "artist": "アーティスト名",
      "album": "アルバム名",
      "score": 75
    },
    {
      "rank": 3,
      "title": "曲名",
      "artist": "アーティスト名",
      "album": "アルバム名",
      "score": 60
    }
  ]
}
```

**レスポンス（認識できなかった場合）**
```json
{
  "status": "no_result",
  "results": []
}
```

**レスポンス（エラー時）**
```json
{
  "status": "error",
  "message": "エラー内容"
}
```

---

## 3. フロントエンド設計

### 3.1 状態遷移
```
待機中
  └─[録音開始ボタン押下]→ 録音中（最大30秒）
       └─[録音停止ボタン押下 or 30秒経過]→ 認識中（ローディング）
            ├─[成功]→ 結果表示
            └─[失敗]→ エラー表示
                          └─[もう一度試す]→ 待機中
```

### 3.2 録音仕様
- Web Audio API の `MediaRecorder` を使用
- 録音フォーマット: WebM（ブラウザデフォルト）
- 録音データはBlobとして保持し、FormDataでバックエンドに送信

---

## 4. バックエンド設計

### 4.1 ファイル構成
| ファイル | 役割 |
|----------|------|
| `main.py` | FastAPIアプリ定義、ルーティング |
| `recognizer.py` | ACRCloudへのリクエスト処理・レスポンス整形 |

### 4.2 ACRCloud連携
- ACRCloud SDK（`pyacrcloud`）またはHTTPリクエストで連携
- 認証: HMAC-SHA1署名（ACRCloud仕様に従う）
- エンドポイント: ACRCloudダッシュボードで取得したホスト名を使用

### 4.3 CORS設定
- ローカル開発: `http://localhost` を許可
- 本番: デプロイ先ドメインを許可

---

## 5. セキュリティ設計

| 項目 | 対策 |
|------|------|
| APIキー管理 | `.env` ファイルで管理、Gitにコミットしない |
| 音声データ | バックエンドで一時保持のみ、保存しない |
| HTTPS | 本番環境ではHTTPS必須（Render.comは自動対応） |

---

## 6. 開発フェーズ

| フェーズ | 内容 |
|----------|------|
| Phase 1 | バックエンド構築（FastAPI + ACRCloud連携） |
| Phase 2 | フロントエンド構築（録音UI + API通信） |
| Phase 3 | ローカル結合テスト |
| Phase 4 | Render.comへのデプロイ（将来） |
