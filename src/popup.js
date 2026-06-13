import "./popup.css";
import { BAND_FREQUENCIES, DEFAULT_SETTINGS, normalizeSettings } from "./settings.js";

/**
 * @typedef {import("./settings.js").EqSettings} EqSettings
 */

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T}
 */
const $ = (id) => {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`${id} が見つかりません`);
    }
    return /** @type {T} */ (element);
};

const statusEl = $("status");
const eqEnabledEl = /** @type {HTMLInputElement} */ ($("eqEnabled"));
const volumeEl = /** @type {HTMLInputElement} */ ($("volume"));

const bandInputs = /** @type {Record<number, HTMLInputElement>} */ (
    Object.fromEntries(BAND_FREQUENCIES.map((freq) => [freq, /** @type {HTMLInputElement} */ ($(`band-${freq}`))]))
);

const setStatus = (message, isError = false) => {
    statusEl.textContent = message;
    statusEl.className = isError ? "error" : "";
};

const toInt = (value) => Number.parseInt(value, 10);

/** @type {EqSettings} */
let currentSettings = DEFAULT_SETTINGS;

const reflectSettingsToUI = () => {
    eqEnabledEl.checked = currentSettings.enabled;
    volumeEl.value = String(currentSettings.volumeDb);
    $("value-volume").textContent = `${currentSettings.volumeDb} dB`;

    BAND_FREQUENCIES.forEach((freq) => {
        const value = currentSettings.bands[freq];
        bandInputs[freq].value = String(value);
        $(`value-${freq}`).textContent = `${value} dB`;
    });
};

/** @returns {EqSettings} */
const readSettingsFromUI = () =>
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

/**
 * @param {unknown} message
 * @returns {Promise<any>}
 */
const sendMessage = (message) =>
    new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
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
        await sendMessage({ type: "UPDATE_SETTINGS", settings: currentSettings });
        setStatus("設定を保存しました");
    } catch (error) {
        setStatus(error instanceof Error ? error.message : "設定保存に失敗しました", true);
    }
};

const init = async () => {
    reflectSettingsToUI();

    try {
        const response = await sendMessage({
            type: "INIT_ACTIVE_TAB",
        });

        currentSettings = normalizeSettings(response.settings);
        reflectSettingsToUI();

        if (!response.ok) {
            setStatus(response.error ?? "音声処理の初期化に失敗しました", true);
            return;
        }

        setStatus("現在のタブに適用中");
    } catch (error) {
        setStatus(error instanceof Error ? error.message : "初期化に失敗しました", true);
    }
};

[eqEnabledEl, volumeEl, ...Object.values(bandInputs)].forEach((input) => {
    input.addEventListener("input", () => {
        currentSettings = readSettingsFromUI();
        reflectSettingsToUI();
        void saveSettings();
    });
});

void init();
