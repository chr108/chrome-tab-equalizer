import './popup.css';
import { BAND_FREQUENCIES, DEFAULT_SETTINGS, normalizeSettings } from './settings';
import type { EqSettings } from './settings';

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`${id} が見つかりません`);
  }
  return element as T;
};

const statusEl = $('status');
const eqEnabledEl = $('eqEnabled') as HTMLInputElement;
const volumeEl = $('volume') as HTMLInputElement;

const bandInputs = Object.fromEntries(
  BAND_FREQUENCIES.map((freq) => [freq, $<HTMLInputElement>(`band-${freq}`)]),
) as Record<number, HTMLInputElement>;

const setStatus = (message: string, isError = false) => {
  statusEl.textContent = message;
  statusEl.className = isError ? 'error' : '';
};

const toInt = (value: string) => Number.parseInt(value, 10);

let currentSettings: EqSettings = DEFAULT_SETTINGS;

const reflectSettingsToUI = () => {
  eqEnabledEl.checked = currentSettings.enabled;
  volumeEl.value = String(currentSettings.volumeDb);
  $('value-volume').textContent = `${currentSettings.volumeDb} dB`;

  BAND_FREQUENCIES.forEach((freq) => {
    const value = currentSettings.bands[freq];
    bandInputs[freq].value = String(value);
    $(`value-${freq}`).textContent = `${value} dB`;
  });
};

const readSettingsFromUI = (): EqSettings =>
  normalizeSettings({
    enabled: eqEnabledEl.checked,
    volumeDb: toInt(volumeEl.value),
    bands: {
      60: toInt(bandInputs[60].value),
      250: toInt(bandInputs[250].value),
      1000: toInt(bandInputs[1000].value),
      4000: toInt(bandInputs[4000].value),
      8000: toInt(bandInputs[8000].value),
    },
  });

const sendMessage = <T>(message: unknown): Promise<T> =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });

const saveSettings = async () => {
  currentSettings = readSettingsFromUI();

  try {
    await sendMessage({ type: 'UPDATE_SETTINGS', settings: currentSettings });
    setStatus('設定を保存しました');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : '設定保存に失敗しました', true);
  }
};

const init = async () => {
  reflectSettingsToUI();

  try {
    const response = await sendMessage<{ ok: boolean; settings: EqSettings; error?: string }>({
      type: 'INIT_ACTIVE_TAB',
    });

    currentSettings = normalizeSettings(response.settings);
    reflectSettingsToUI();

    if (!response.ok) {
      setStatus(response.error ?? '音声処理の初期化に失敗しました', true);
      return;
    }

    setStatus('現在のタブに適用中');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : '初期化に失敗しました', true);
  }
};

[eqEnabledEl, volumeEl, ...Object.values(bandInputs)].forEach((input) => {
  input.addEventListener('input', () => {
    currentSettings = readSettingsFromUI();
    reflectSettingsToUI();
    void saveSettings();
  });
});

void init();
