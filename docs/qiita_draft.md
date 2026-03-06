# 【Python × FastAPI】鼻歌を録音するだけで曲名を当てるWebアプリを作ってRender.comで公開した話

## この記事で分かること

- ACRCloud Humming Recognition APIを使った鼻歌認識の実装方法
- FastAPIでフロントエンドも配信するシンプルな1サービス構成の作り方
- ブラウザ録音（WebM）→ ffmpegでWAV変換 → APIへ送信 の音声処理フロー
- Render.comへのデプロイ手順
- Python 3.13で`pydub`が動かない問題の解決策

---

## はじめに

「あの曲、なんだっけ…？」

メロディーは頭に浮かんでいるのに、曲名もアーティスト名も出てこない。そんなもどかしい経験、誰しも一度はあるはずです。

そこで **鼻歌を録音するだけで曲名を特定してくれるWebアプリ「HumMatch」** を作りました。

https://humatch.onrender.com

Webアプリ開発・公開ともに今回が初挑戦でした。Pythonは競技プログラミングで使っていましたが、FastAPI・JavaScript・デプロイはすべて初めてです。同じく初心者の方の参考になれば嬉しいです。

---

## 作ったもの

**HumMatch** — 鼻歌で曲を当てるWebアプリ

| 項目 | 内容 |
|------|------|
| URL | https://humatch.onrender.com |
| 対応楽曲 | 日本語楽曲（J-POP・アニソンなど） |
| 録音時間 | 最大30秒 |
| 表示形式 | 信頼度付き上位3候補 |
| 対応端末 | PC・スマホ両対応 |

**使い方はシンプルです：**
1. マイクボタンをタップして鼻歌を歌う
2. 停止ボタンを押す（または30秒経過で自動停止）
3. 曲名・アーティスト名・信頼度が表示される

> GitHubリポジトリ：https://github.com/konkai0816-dev/hanauta-app

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | HTML / CSS / JavaScript（バニラ） |
| バックエンド | Python 3.13 / FastAPI |
| 曲認識API | ACRCloud Humming Recognition |
| 音声変換 | ffmpeg |
| デプロイ | Render.com（無料プラン） |

フレームワークやライブラリはできるだけ少なくし、シンプルな構成を心がけました。

---

## システム構成

```
[ブラウザ]
  ↓ Web Audio API (MediaRecorder) で録音 → WebM/Opus形式
  ↓ FormData で POST 送信
[FastAPI バックエンド]
  ↓ ffmpeg で WebM → WAV（16kHz・モノラル）に変換
  ↓ HMAC-SHA1署名を付けてACRCloud APIへ送信
[ACRCloud Humming Recognition API]
  ↓ 鼻歌のメロディーを解析・データベースとマッチング
  ↓ 曲名・アーティスト・信頼度スコアを返す
[FastAPIがJSONに整形してフロントエンドへ]
  ↓
[ブラウザに結果表示]
```

FastAPIがフロントエンドのファイル（HTML/CSS/JS）も配信する **1サービス構成** にしたので、Render.comへのデプロイが1回で済みます。

---

## 実装のポイント

### 1. ACRCloudのプロジェクト設定（重要）

鼻歌認識には、通常の音楽認識（Audio Fingerprinting）とは **別のエンジン** が必要です。

プロジェクト作成時に以下を選択してください：

| 設定項目 | 選択する値 |
|----------|-----------|
| Audio Source | **Recorded Audio** |
| Audio Engine | **Cover Song (Humming) Identification** |

最初に「Audio Fingerprinting」を選んでしまい、何度やっても`1001: No result`が返り続けました。**エンジンの選択が最重要ポイントです。**

### 2. 音声フォーマットの変換（WebM → WAV）

ブラウザの`MediaRecorder`はデフォルトで **WebM/Opus形式** で録音します。しかしACRCloudはWebMに非対応のため、そのまま送ると認識されません。

バックエンドでffmpegを使ってWAVに変換してから送るようにしました。

```python
import subprocess

def convert_to_wav(audio_bytes: bytes) -> bytes:
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", "pipe:0", "-ar", "16000", "-ac", "1", "-f", "wav", "pipe:1"],
        input=audio_bytes,
        capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg error: {result.stderr.decode()}")
    return result.stdout
```

- `-ar 16000`：サンプルレートを16kHzに設定
- `-ac 1`：モノラルに変換

16kHz・モノラルにすることで、鼻歌認識の精度が向上しました。

### 3. ACRCloudへのリクエスト（HMAC-SHA1署名）

ACRCloudのAPIはリクエストにHMAC-SHA1署名が必要です。

```python
import base64, hashlib, hmac, time

timestamp = str(time.time())
string_to_sign = "\n".join([
    "POST", "/v1/identify", access_key,
    "humming", "1", timestamp
])
sign = base64.b64encode(
    hmac.new(
        access_secret.encode("utf-8"),
        string_to_sign.encode("utf-8"),
        hashlib.sha1
    ).digest()
).decode("utf-8")
```

鼻歌認識では `data_type = "humming"` を指定します。`"audio"` にすると通常の音楽指紋認識になってしまうので注意です。

### 4. FastAPIでフロントエンドを配信

`StaticFiles` と `FileResponse` を使って、バックエンドからHTMLも配信します。

```python
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="static")
```

フロントエンド側のAPIのURLは `"/recognize"` と相対パスにするのがポイントです（`localhost:8000` のままだと本番環境で動かない）。

### 5. 信頼度のしきい値処理

ACRCloudは信頼度が低くても候補を返すことがあります。信頼度30%未満は「特定できなかった」として除外しています。

また、スコアは `0〜1` の小数で返ってくるので、100倍してパーセント表示にします。

```python
score = round(item.get("score", 0) * 100)
# 30%未満は除外
results = [r for r in results if r["score"] >= 30]
```

---

## ハマったポイント

### pydub が Python 3.13 で動かない

音声変換に最初`pydub`を使おうとしましたが、Python 3.13では`audioop`モジュールが標準ライブラリから削除されており、以下のエラーが発生しました。

```
ModuleNotFoundError: No module named 'pyaudioop'
```

代替の`pyaudioop`パッケージもPyPIに存在しないため、**ffmpegをsubprocessで直接呼び出す方法** に切り替えました。結果的にこちらの方がシンプルで安定しています。

### ACRCloudのプロジェクト数が上限に達した

無料枠はプロジェクト数に上限があります。試行錯誤でいくつか作っていたら上限に達し、新しいアカウントで作り直すことになりました。最初から正しいエンジン（Humming Identification）を選ぶことをおすすめします。

### デバッグはレスポンスをそのままprintするのが早い

認識できない原因を調べるとき、ACRCloudのレスポンスをそのまま`print`するのが一番早かったです。

```python
raw = recognize(audio_bytes, audio_format)
print(raw)  # {'status': {'msg': 'No result', 'code': 1001}} など
```

`code: 1001`は「認識できなかった」、`code: 0`は成功です。認証エラーやフォーマットエラーは別のコードで返ってきます。

---

## UIのこだわり

シンプルになりすぎないよう、細かい部分にこだわりました。

| 要素 | こだわり |
|------|---------|
| テーマ | ダークテーマ＋パープルグラデーションで音楽アプリらしい雰囲気に |
| 録音ボタン | 録音中はパルスアニメーションで「録音中」を視覚的に伝える |
| タイマー | プログレスバーで録音残り時間を可視化 |
| ローディング | スピナーではなく音波アニメーションで「音声処理中」を表現 |
| 結果カード | 1st/2nd/3rdバッジ＋スコアバーで視認性を向上 |

---

## Render.comへのデプロイ

GitHubリポジトリと連携することで、`git push`するだけで自動デプロイされます。

リポジトリに`render.yaml`を1ファイル置くだけで設定が完結します。

```yaml
services:
  - type: web
    name: humatch
    runtime: python
    buildCommand: "pip install -r backend/requirements.txt"
    startCommand: "uvicorn backend.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: ACRCLOUD_HOST
        sync: false
      - key: ACRCLOUD_ACCESS_KEY
        sync: false
      - key: ACRCLOUD_ACCESS_SECRET
        sync: false
```

APIキーは`envVars`でRender.comのダッシュボードから設定し、コードには一切含めません。

**無料プランの注意点：** 一定時間アクセスがないとサーバーがスリープします。スリープ後の初回アクセスは起動に30〜60秒ほどかかります。

---

## まとめ

| やったこと | 技術・サービス |
|-----------|--------------|
| ブラウザ録音 | Web Audio API（MediaRecorder） |
| 音声フォーマット変換 | ffmpeg（WebM → WAV） |
| 鼻歌認識 | ACRCloud Humming Recognition API |
| バックエンド | Python / FastAPI |
| フロントエンド | HTML / CSS / JavaScript |
| デプロイ | Render.com |

初めてのWebアプリ開発・公開でしたが、設計〜実装〜デプロイまで一通り経験できました。

特に「ブラウザ録音した音声をAPIに渡す」という音声処理の部分は調べてもあまり情報がなく苦労しましたが、ffmpegでの変換という解決策にたどり着けました。同じところで詰まっている方の参考になれば嬉しいです。

ぜひ試してみてください！
https://humatch.onrender.com

---

## 参考リンク

- [ACRCloud公式ドキュメント](https://docs.acrcloud.com/)
- [FastAPI公式ドキュメント](https://fastapi.tiangolo.com/)
- [Render.com公式ドキュメント](https://render.com/docs)
- [GitHubリポジトリ](https://github.com/konkai0816-dev/hanauta-app)
