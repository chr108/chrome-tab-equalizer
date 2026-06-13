import { DEFAULT_SETTINGS, STORAGE_KEY, normalizeSettings } from "./settings.js";

/**
 * @typedef {import("./settings.js").EqSettings} EqSettings
 */

const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

/**
 * @typedef {Object} InitResponse
 * @property {boolean} ok
 * @property {EqSettings} settings
 * @property {string} [error]
 */

/**
 * @param {unknown} message
 * @returns {Promise<any>}
 */
const sendMessageToOffscreen = (message) =>
    new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(response);
        });
    });

const ensureOffscreenDocument = async () => {
    if (chrome.runtime.getContexts) {
        const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
        const contexts = await chrome.runtime.getContexts({
            contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
            documentUrls: [offscreenUrl],
        });

        if (contexts.length > 0) {
            return;
        }
    }

    try {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
            justification: "Play processed active tab audio with EQ and volume control",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("single offscreen document")) {
            throw error;
        }
    }
};

/** @returns {Promise<EqSettings>} */
const readSettings = async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return normalizeSettings(result[STORAGE_KEY] ?? DEFAULT_SETTINGS);
};

/** @param {EqSettings} settings */
const writeSettings = async (settings) => {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
};

const getActiveTabId = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id;
};

/** @param {EqSettings} settings */
const startForActiveTab = async (settings) => {
    const tabId = await getActiveTabId();
    if (tabId === undefined) {
        throw new Error("アクティブなタブを取得できませんでした");
    }

    await ensureOffscreenDocument();

    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
    await sendMessageToOffscreen({
        type: "OFFSCREEN_START",
        streamId,
        settings,
    });
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object" || !Object.prototype.hasOwnProperty.call(message, "type")) {
        return;
    }

    (async () => {
        if (message.type === "INIT_ACTIVE_TAB") {
            const settings = await readSettings();
            try {
                await startForActiveTab(settings);
                /** @type {InitResponse} */
                const response = { ok: true, settings };
                sendResponse(response);
            } catch (error) {
                /** @type {InitResponse} */
                const response = {
                    ok: false,
                    settings,
                    error: error instanceof Error ? error.message : "初期化に失敗しました",
                };
                sendResponse(response);
            }
            return;
        }

        if (message.type === "UPDATE_SETTINGS") {
            const settings = normalizeSettings(message.settings);
            await writeSettings(settings);

            try {
                await sendMessageToOffscreen({ type: "OFFSCREEN_UPDATE_SETTINGS", settings });
            } catch {
                // offscreen未起動時は次回INITで反映
            }

            sendResponse({ ok: true, settings });
            return;
        }
    })().catch((error) => {
        sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "unknown error",
            settings: DEFAULT_SETTINGS,
        });
    });

    return true;
});
