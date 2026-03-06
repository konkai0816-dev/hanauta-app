# HumMatch — 鼻歌で曲を当てよう

「あの曲、なんだっけ？」をすぐに解決する鼻歌曲名検索Webアプリです。

ブラウザ上でマイクに向かって鼻歌を歌うだけで、曲名とアーティスト名を特定します。

---

## 機能

- **ワンタップ録音** — 録音ボタンを押すだけで鼻歌を録音（最大30秒）
- **AI曲認識** — 録音した鼻歌をACRCloud APIで解析し、曲を特定
- **信頼度付き候補表示** — 上位3曲を信頼度（%）とともに表示
- **スマホ対応** — スマートフォンからでもそのまま使用可能

---

## 対応楽曲

日本語楽曲（J-POP、アニソン、演歌 など）を主な対象としています。
洋楽は認識できない場合があります。

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | HTML / CSS / JavaScript（バニラ） |
| バックエンド | Python / FastAPI |
| 曲認識API | ACRCloud Humming Recognition |
| 音声変換 | ffmpeg |

---

## ローカルでの動かし方

### 必要なもの

- Python 3.11 以上
- ffmpeg（[インストール方法](https://ffmpeg.org/download.html)）
- ACRCloud アカウント（[登録はこちら](https://www.acrcloud.com/)）

### 手順

**1. リポジトリをクローン**

```bash
git clone https://github.com/konkai0816-dev/hanauta-app.git
cd hanauta-app
```

**2. 環境変数ファイルを作成**

`.env` ファイルをプロジェクトルートに作成し、ACRCloudのAPIキーを記入します。

```
ACRCLOUD_HOST=your_host
ACRCLOUD_ACCESS_KEY=your_access_key
ACRCLOUD_ACCESS_SECRET=your_access_secret
```

ACRCloudダッシュボードで「Cover Song (Humming) Identification」タイプのプロジェクトを作成すると、上記の値が取得できます。

**3. バックエンドのセットアップ**

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac / Linux
pip install -r requirements.txt
```

**4. バックエンド起動**

```bash
uvicorn main:app --reload
```

**5. フロントエンドを開く**

`frontend/index.html` をブラウザで開きます。

---

## 使い方

1. ブラウザでページを開く
2. マイクのアクセス許可を許可する
3. 録音ボタンをタップして鼻歌を歌う（サビ部分を15〜20秒歌うと認識精度が上がります）
4. 録音停止ボタンを押すと自動で解析が始まる
5. 曲名・アーティスト名・信頼度が表示される

---

## 注意事項

- HTTPS または `localhost` 環境でのみマイクが使用できます
- ACRCloud の無料枠は 1,000回/日 です

---

## ライセンス

MIT License
