import { BAND_FREQUENCIES, normalizeSettings } from "./settings.js";

let audioContext = null;
let mediaStream = null;
let sourceNode = null;
let filters = [];
let gainNode = null;

const dbToGain = (db) => 10 ** (db / 20);

const cleanup = async () => {
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    sourceNode = null;
    filters = [];
    gainNode = null;

    if (audioContext) {
        await audioContext.close();
        audioContext = null;
    }
};

const applySettings = (settings) => {
    if (!gainNode || filters.length === 0) {
        return;
    }

    filters.forEach((filter, index) => {
        const frequency = BAND_FREQUENCIES[index];
        filter.gain.value = settings.enabled ? settings.bands[frequency] : 0;
    });

    gainNode.gain.value = dbToGain(settings.volumeDb);
};

const startWithStreamId = async (streamId, rawSettings) => {
    await cleanup();

    mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            mandatory: {
                chromeMediaSource: "tab",
                chromeMediaSourceId: streamId,
            },
        },
        video: false,
    });

    audioContext = new AudioContext();
    sourceNode = audioContext.createMediaStreamSource(mediaStream);

    filters = BAND_FREQUENCIES.map((frequency) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = frequency;
        filter.Q.value = 1;
        filter.gain.value = 0;
        return filter;
    });

    gainNode = audioContext.createGain();

    let currentNode = sourceNode;
    for (const filter of filters) {
        currentNode.connect(filter);
        currentNode = filter;
    }
    currentNode.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

    applySettings(normalizeSettings(rawSettings));
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object" || !Object.prototype.hasOwnProperty.call(message, "type")) {
        return;
    }

    (async () => {
        if (message.type === "OFFSCREEN_START") {
            await startWithStreamId(message.streamId, message.settings);
            sendResponse({ ok: true });
            return;
        }

        if (message.type === "OFFSCREEN_UPDATE_SETTINGS") {
            applySettings(normalizeSettings(message.settings));
            sendResponse({ ok: true });
            return;
        }
    })().catch((error) => {
        sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "offscreen error",
        });
    });

    return true;
});

self.addEventListener("unload", () => {
    void cleanup();
});
