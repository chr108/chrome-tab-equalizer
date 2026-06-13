# Chrome Tab Equalizer

Google Chrome でアクティブなタブの音声にリアルタイムで5バンドEQとDistortionを適用する拡張機能です。

## 機能

- **5バンドEQ** : 60Hz、250Hz、1kHz、4kHz、8kHz の各周波数帯域を独立調整
- **ゲイン調整** : 各バンド -24dB ～ +24dB
- **Distortion** : WaveShaperNode による歪みエフェクトを ON/OFF で切り替え
- **Drive** : 0dB ～ +36dB の前段ゲインで歪みの入り方を調整
- **Distortion Amount** : 0 ～ 100 でカーブの強さを調整
- **Distortion カーブ** : Hard 固定
- **Distortion Output Gain** : -24dB ～ +6dB の後段ゲインで歪み後の音量を補正
- **マスターボリューム** : -12dB ～ +12dB
- **縦バーUI** : EQ / Volume / Distortion の全スライダーを縦方向で統一
- **離散ステップ** : 全スライダーは段階的に調整
- **ON/OFF切り替え** : EQ の即座有効/無効化
- **設定保存** : EQ / Distortion / 音量の最後に使った設定を自動保存

## インストール

1. **Chrome に読み込む**
    - Chrome で `chrome://extensions/` を開く
    - 「デベロッパー モード」を有効化
    - 「パッケージ化されていない拡張機能を読み込む」をクリック
    - このリポジトリのルートフォルダ（`manifest.json` がある階層）を選択
2. **動作確認の基本フロー**
    - オーディオ再生中のタブをアクティブにする
    - 拡張popupを開く
    - EQ スライダー、Distortion 設定、または音量スライダーを動かす
    - popup再オープン後も設定が保持されることを確認する

## 使い方

1. ブラウザゲームやオーディオコンテンツを開く
2. 該当タブをアクティブにする
3. 拡張アイコンをクリック
4. EQ スライダーを調整して希望の音色に設定
5. Distortion を有効化し、Drive / Amount / Output Gain を調整する
6. 必要に応じてマスターボリュームで最終音量を整える
7. popup を閉じて再度開き、調整値が維持されることを確認する

## 制約事項

- `chrome.tabCapture` の仕様により、キャプチャ中はタブに「このタブのコンテンツは共有されています」の表示（青い共有インジケーター）が出ます。
- この表示は拡張機能から非表示にはできません。
- 本拡張ではタブ切り替え時にキャプチャを停止し、不要時にインジケーターが残り続けないようにしています。

## Distortion 仕様

- Distortion ON 時の音声チェーンは `input -> EQ -> driveGain -> waveShaper -> outputGain -> masterVolume -> destination`
- Distortion OFF 時は歪み段をバイパスし、EQ 出力をそのままマスターボリュームへ接続
- Drive と Distortion Output Gain は UI 上では dB 表示し、内部で linear gain に変換して適用
- WaveShaperNode の `oversample` は `"4x"` 固定
- Distortion カーブは Hard 固定（強いクリップ感のあるカーブ）

## 保存される設定

- EQ ON/OFF
- 5バンド EQ の各ゲイン
- Distortion ON/OFF
- Drive
- Distortion Amount
- Distortion Output Gain
- マスターボリューム

## ライセンス

[MIT License](LICENSE)
