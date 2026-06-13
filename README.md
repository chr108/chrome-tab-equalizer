# chrome-tab-equalizer

Google Chrome (Manifest V3) 向けに、**現在アクティブなタブ音声**へリアルタイムEQを適用する最小構成の拡張です。  
`tabCapture + offscreen document + Web Audio API` で動作します。

## 機能

- 5バンドEQ (60Hz / 250Hz / 1kHz / 4kHz / 8kHz)
- 各バンド `-12dB ～ +12dB`
- EQ ON/OFF
- 音量調整 `-12dB ～ +12dB`
- 最後に使った設定を `chrome.storage.local` に保存
- popup UI は日本語

## ディレクトリ構成

```text
.
├─ offscreen.html
├─ popup.html
├─ public/
│  └─ manifest.json
├─ src/
│  ├─ background.ts
│  ├─ offscreen.ts
│  ├─ popup.css
│  ├─ popup.ts
│  └─ settings.ts
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

## セットアップ

```bash
npm install
npm run build
```

ビルド後に `dist/` を Chrome の「パッケージ化されていない拡張機能を読み込む」で読み込んでください。

## 使い方

1. ブラウザゲームを開いたタブをアクティブにする
2. 拡張アイコンを開く
3. popup が初期化されると、そのアクティブタブ音声を取り込み開始
4. EQ/音量スライダーを調整

## 権限

- `tabCapture`: タブ音声の取得
- `offscreen`: offscreen document の作成
- `storage`: 設定保存
- `tabs`: アクティブタブID取得

## 最低限のエラーハンドリング

- popup / service worker / offscreen 間メッセージで失敗時にエラー文言を表示
- offscreen 未起動時に設定更新が来ても、次回初期化時に再適用
