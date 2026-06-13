import { BAND_FREQUENCIES, DEFAULT_SETTINGS, STORAGE_KEY, normalizeSettings } from "./settings.js";

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
const distortionEnabledEl = /** @type {HTMLInputElement} */ ($("distortionEnabled"));
const distortionControlsEl = /** @type {HTMLFieldSetElement} */ ($("distortionControls"));
const driveEl = /** @type {HTMLInputElement} */ ($("drive"));
const distortionAmountEl = /** @type {HTMLInputElement} */ ($("distortionAmount"));
const outputGainEl = /** @type {HTMLInputElement} */ ($("outputGain"));

const bandInputs = /** @type {Record<number, HTMLInputElement>} */ (
    Object.fromEntries(BAND_FREQUENCIES.map((freq) => [freq, /** @type {HTMLInputElement} */ ($(`band-${freq}`))]))
);

const settingsInputs = [
    eqEnabledEl,
    volumeEl,
    distortionEnabledEl,
    driveEl,
    distortionAmountEl,
    outputGainEl,
    ...Object.values(bandInputs),
];

const setStatus = (message, isError = false) => {
    statusEl.textContent = message;
    statusEl.className = isError ? "error" : "";
};

const toInt = (value) => Number.parseInt(value, 10);

/** @type {EqSettings} */
let currentSettings = DEFAULT_SETTINGS;

const syncDistortionControlState = () => {
    distortionControlsEl.disabled = !currentSettings.distortionEnabled;
};

const updateValueLabelsFromInputs = () => {
    $("value-volume").textContent = `${volumeEl.value} dB`;
    $("value-drive").textContent = `${driveEl.value} dB`;
    $("value-distortionAmount").textContent = distortionAmountEl.value;
    $("value-outputGain").textContent = `${outputGainEl.value} dB`;

    BAND_FREQUENCIES.forEach((freq) => {
        $(`value-${freq}`).textContent = `${bandInputs[freq].value} dB`;
    });
};

const reflectSettingsToUI = () => {
    eqEnabledEl.checked = currentSettings.enabled;
    volumeEl.value = String(currentSettings.volumeDb);
    $("value-volume").textContent = `${currentSettings.volumeDb} dB`;
    distortionEnabledEl.checked = currentSettings.distortionEnabled;
    driveEl.value = String(currentSettings.driveDb);
    $("value-drive").textContent = `${currentSettings.driveDb} dB`;
    distortionAmountEl.value = String(currentSettings.distortionAmount);
    $("value-distortionAmount").textContent = String(currentSettings.distortionAmount);
    outputGainEl.value = String(currentSettings.outputGainDb);
    $("value-outputGain").textContent = `${currentSettings.outputGainDb} dB`;

    BAND_FREQUENCIES.forEach((freq) => {
        const value = currentSettings.bands[freq];
        bandInputs[freq].value = String(value);
        $(`value-${freq}`).textContent = `${value} dB`;
    });

    syncDistortionControlState();
};

/** @returns {EqSettings} */
const readSettingsFromUI = () =>
    normalizeSettings({
        enabled: eqEnabledEl.checked,
        volumeDb: toInt(volumeEl.value),
        distortionEnabled: distortionEnabledEl.checked,
        driveDb: toInt(driveEl.value),
        distortionAmount: toInt(distortionAmountEl.value),
        outputGainDb: toInt(outputGainEl.value),
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
    updateValueLabelsFromInputs();

    try {
        await chrome.storage.local.set({ [STORAGE_KEY]: currentSettings });
        await sendMessage({ type: "UPDATE_SETTINGS", settings: currentSettings });
        setStatus("設定を保存しました");
    } catch (error) {
        setStatus(error instanceof Error ? error.message : "設定保存に失敗しました", true);
    }
};

const init = async () => {
    try {
        const localResult = await chrome.storage.local.get(STORAGE_KEY);
        currentSettings = normalizeSettings(localResult[STORAGE_KEY] ?? DEFAULT_SETTINGS);
    } catch {
        currentSettings = DEFAULT_SETTINGS;
    }

    reflectSettingsToUI();

    try {
        const response = await sendMessage({
            type: "INIT_ACTIVE_TAB",
        });

        if (response?.settings) {
            currentSettings = normalizeSettings(response.settings);
            reflectSettingsToUI();
        }

        if (!response.ok) {
            setStatus(response.error ?? "音声処理の初期化に失敗しました", true);
            return;
        }

        setStatus("現在のタブに適用中");
    } catch (error) {
        setStatus(error instanceof Error ? error.message : "初期化に失敗しました", true);
    }
};

const handleSettingsInput = () => {
    updateValueLabelsFromInputs();
    currentSettings = readSettingsFromUI();
    syncDistortionControlState();
    void saveSettings();
};

settingsInputs.forEach((input) => {
    input.addEventListener("input", handleSettingsInput);
    input.addEventListener("change", handleSettingsInput);
});

void init();
