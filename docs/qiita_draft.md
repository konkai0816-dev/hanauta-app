# 鼻歌を歌うだけで曲名を当ててくれるWebアプリを作った話

## はじめに

「あの曲、なんだっけ…？」

メロディーは頭の中に流れているのに、曲名もアーティスト名も思い出せない。そんな経験、誰しも一度はあると思います。

そこで、**鼻歌を録音するだけで曲名を特定してくれるWebアプリ「HumMatch」** を作りました。

本記事では、企画〜設計〜実装〜Web公開までの一連の流れを紹介します。Webアプリ開発・公開ともに初挑戦だったので、同じく初心者の方の参考になれば嬉しいです。

---

## 作ったもの

**HumMatch** — 鼻歌で曲を当てるWebアプリ

- ブラウザ上のマイクボタンを押して鼻歌を録音（最大30秒）
- 録音した音声をAIで解析し、曲名・アーティスト名を特定
- 信頼度付きで上位3候補を表示
- スマホにも対応

対象楽曲はJ-POP・アニソンなどの日本語楽曲です。

> GitHubリポジトリ：https://github.com/konkai0816-dev/hanauta-app

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | HTML / CSS / JavaScript（バニラ） |
| バックエンド | Python / FastAPI |
| 曲認識API | ACRCloud Humming Recognition |
| 音声変換 | ffmpeg |
| デプロイ | Render.com |

Pythonは大学時代に競技プログラミングで使っていたので得意でしたが、Webアプリ開発・JavaScriptは今回が初挑戦でした。

---

## システム構成

```
[ブラウザ]
  ↓ Web Audio API で録音（WebM形式）
  ↓ fetch() で音声データをPOST
[FastAPI バックエンド]
  ↓ ffmpegでWebM → WAVに変換
  ↓ ACRCloud APIへ送信
[ACRCloud API]
  ↓ 鼻歌を解析・マッチング
  ↓ 曲名・アーティスト・信頼度を返す
[ブラウザに結果表示]
```

フロントエンドとバックエンドを分けず、**FastAPIがフロントエンドのファイルも配信する** シンプルな1サービス構成にしました。

---

## 実装のポイント

### 1. ACRCloudの設定

鼻歌認識には通常の音楽認識（Audio Fingerprinting）とは別のエンジンが必要です。

プロジェクト作成時の設定：
- **Recorded Audio**（録音した音声）を選択
- **Cover Song (Humming) Identification** エンジンを選択

最初に間違ったエンジンを選んでしまい、何度やっても認識できない状態が続きました。プロジェクトタイプの選択が重要です。

### 2. 音声フォーマットの変換

ブラウザの `MediaRecorder` API はデフォルトで **WebM/Opus形式** で録音します。しかしACRCloudはWebMに対応していないため、そのままでは認識できませんでした。

解決策として、バックエンドで **ffmpegを使ってWebM→WAVに変換** してからACRCloudに送るようにしました。

```python
import subprocess

def convert_to_wav(audio_bytes: bytes) -> bytes:
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", "pipe:0", "-ar", "16000", "-ac", "1", "-f", "wav", "pipe:1"],
        input=audio_bytes,
        capture_output=True,
    )
    return result.stdout
```

`-ar 16000`（サンプルレート16kHz）`-ac 1`（モノラル）にすることで鼻歌認識の精度が向上しました。

### 3. ACRCloudへのリクエスト（HMAC署名）

ACRCloudのAPIはHMAC-SHA1署名による認証が必要です。

```python
string_to_sign = "\n".join([http_method, http_uri, access_key, data_type, signature_version, timestamp])
sign = base64.b64encode(
    hmac.new(access_secret.encode("utf-8"), string_to_sign.encode("utf-8"), hashlib.sha1).digest()
).decode("utf-8")
```

鼻歌認識の場合は `data_type = "humming"` を指定することが重要です（`"audio"` にすると通常の音楽認識になってしまいます）。

### 4. 信頼度のしきい値

ACRCloudはスコアが低くても何らかの候補を返すことがあります。信頼度30%未満の結果は「特定できなかった」として扱うようにしました。

また、スコアは0〜1の小数で返ってくるので、100倍してパーセント表示に変換しています。

---

## ハマったポイント

### pydubがPython 3.13で動かない

音声変換にはじめ `pydub` を使おうとしましたが、Python 3.13では `audioop` モジュールが標準ライブラリから削除されており、エラーが発生しました。

```
ModuleNotFoundError: No module named 'pyaudioop'
```

代替パッケージ `pyaudioop` もPyPIに存在しないため、結果的に **ffmpegを直接subprocessで呼び出す** 方法に切り替えました。

### ACRCloudのプロジェクト数制限

ACRCloudの無料枠はプロジェクト数に上限があります。テストでいくつか作っていたため上限に達してしまい、新しいアカウントで作り直すことになりました。最初から正しいエンジンを選んでプロジェクトを作ることをおすすめします。

---

## UIのこだわり

シンプルになりすぎないよう、以下の点に気をつけてデザインしました。

- ダークテーマ＋パープルグラデーションで音楽アプリらしい雰囲気に
- 録音中はマイクボタンにパルスアニメーションを表示
- 録音時間をプログレスバーで可視化
- 認識中は音波アニメーションで「処理中」を表現
- 結果カードに1st/2nd/3rdバッジとスコアバーを表示

---

## デプロイ（Render.com）

Render.comを使ってWeb公開しました。GitHubリポジトリと連携することで、`git push` するだけで自動デプロイされます。

`render.yaml` を1ファイル置くだけで設定が完結するのが便利でした。

```yaml
services:
  - type: web
    name: hanauta-app
    runtime: python
    buildCommand: "pip install -r backend/requirements.txt"
    startCommand: "uvicorn backend.main:app --host 0.0.0.0 --port $PORT"
```

APIキーなどの秘密情報はRender.comのダッシュボードで環境変数として設定し、コードには一切含めていません。

---

## まとめ

| やったこと | 使った技術・サービス |
|-----------|-------------------|
| 鼻歌録音 | Web Audio API（MediaRecorder） |
| 音声変換 | ffmpeg |
| 曲認識 | ACRCloud Humming Recognition API |
| バックエンド | Python / FastAPI |
| フロントエンド | HTML / CSS / JavaScript |
| デプロイ | Render.com |

初めてのWebアプリ開発・公開でしたが、AIと対話しながら設計〜実装〜デプロイまで一気通貫で進めることができました。

「鼻歌で曲を当てる」というアイデアから形にするまでの過程で、音声処理・API連携・Webデプロイなど多くのことを学べました。

ぜひ試してみてください！

---

## 参考

- [ACRCloud公式ドキュメント](https://docs.acrcloud.com/)
- [FastAPI公式ドキュメント](https://fastapi.tiangolo.com/)
- [Render.com公式ドキュメント](https://render.com/docs)
