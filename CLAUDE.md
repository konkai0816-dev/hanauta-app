# 鼻歌曲当てWebアプリ - プロジェクト概要

## プロジェクト概要
ユーザーがブラウザ上で鼻歌を録音し、ACRCloud APIを使って曲名・アーティスト名を特定するWebアプリ。

## 技術スタック
- **フロントエンド**: HTML / CSS / JavaScript（バニラ）
- **バックエンド**: Python 3.11+ / FastAPI
- **曲認識API**: ACRCloud（無料枠：1,000回/日）
- **ローカル実行**: uvicorn
- **Web公開（将来）**: Render.com

## ディレクトリ構成
```
鼻歌あてる/
├── CLAUDE.md
├── docs/
│   ├── requirements.md      # 要件定義書
│   └── design.md            # システム設計書
├── backend/
│   ├── main.py              # FastAPI アプリ本体
│   ├── recognizer.py        # ACRCloud連携ロジック
│   └── requirements.txt     # Pythonパッケージ一覧
├── frontend/
│   ├── index.html           # メイン画面
│   ├── style.css            # スタイル
│   └── app.js               # 録音・API通信ロジック
└── .env                     # APIキー等（gitignore対象）
```

## 開発ルール
- APIキーは必ず `.env` に記載し、コードにハードコードしない
- バックエンドは `backend/` 以下に配置
- フロントエンドは `frontend/` 以下に配置
- Python依存パッケージは `backend/requirements.txt` で管理

## ローカル起動手順（開発後に更新）
```bash
# バックエンド起動
cd backend
uvicorn main:app --reload

# フロントエンドはブラウザで frontend/index.html を開く
```

## 環境変数（.env）
```
ACRCLOUD_ACCESS_KEY=your_access_key
ACRCLOUD_ACCESS_SECRET=your_access_secret
ACRCLOUD_HOST=identify-ap-southeast-1.acrcloud.com
```
