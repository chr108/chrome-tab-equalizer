import { BAND_FREQUENCIES, normalizeSettings } from "./settings.js";

let audioContext = null;
let mediaStream = null;
let sourceNode = null;
let filters = [];
let driveGainNode = null;
let waveShaperNode = null;
let distortionOutputGainNode = null;
let masterVolumeNode = null;
let distortionRouted = false;

const dbToGain = (db) => 10 ** (db / 20);

const DISTORTION_CURVE_SIZE = 2048;

const createIdentityCurve = () => {
    const curve = new Float32Array(DISTORTION_CURVE_SIZE);

    for (let index = 0; index < DISTORTION_CURVE_SIZE; index += 1) {
        curve[index] = (index / (DISTORTION_CURVE_SIZE - 1)) * 2 - 1;
    }

    return curve;
};

const createHardCurve = (amount) => {
    if (amount <= 0) {
        return createIdentityCurve();
    }

    const curve = new Float32Array(DISTORTION_CURVE_SIZE);
    const normalizedAmount = amount / 100;
    const threshold = Math.max(0.08, 1 - normalizedAmount * 0.92);

    for (let index = 0; index < DISTORTION_CURVE_SIZE; index += 1) {
        const x = (index / (DISTORTION_CURVE_SIZE - 1)) * 2 - 1;
        curve[index] = Math.max(-1, Math.min(1, x / threshold));
    }

    return curve;
};

const disconnectNode = (node) => {
    if (!node) {
        return;
    }

    try {
        node.disconnect();
    } catch {
        // 未接続ノードの切断失敗は無視する
    }
};

const reconnectOutputGraph = (useDistortion) => {
    const eqOutputNode = filters.at(-1) ?? sourceNode;

    if (!eqOutputNode || !masterVolumeNode) {
        return;
    }

    disconnectNode(eqOutputNode);
    disconnectNode(driveGainNode);
    disconnectNode(waveShaperNode);
    disconnectNode(distortionOutputGainNode);
    disconnectNode(masterVolumeNode);

    if (useDistortion) {
        eqOutputNode.connect(driveGainNode);
        driveGainNode.connect(waveShaperNode);
        waveShaperNode.connect(distortionOutputGainNode);
        distortionOutputGainNode.connect(masterVolumeNode);
    } else {
        eqOutputNode.connect(masterVolumeNode);
    }

    masterVolumeNode.connect(audioContext.destination);
    distortionRouted = useDistortion;
};

const cleanup = async () => {
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    sourceNode = null;
    filters = [];
    driveGainNode = null;
    waveShaperNode = null;
    distortionOutputGainNode = null;
    masterVolumeNode = null;
    distortionRouted = false;

    if (audioContext) {
        await audioContext.close();
        audioContext = null;
    }
};

const applySettings = (settings) => {
    if (!sourceNode || !masterVolumeNode || filters.length === 0) {
        return;
    }

    filters.forEach((filter, index) => {
        const frequency = BAND_FREQUENCIES[index];
        filter.gain.value = settings.enabled ? settings.bands[frequency] : 0;
    });

    driveGainNode.gain.value = dbToGain(settings.driveDb);
    waveShaperNode.curve = createHardCurve(settings.distortionAmount);
    waveShaperNode.oversample = "4x";
    distortionOutputGainNode.gain.value = dbToGain(settings.outputGainDb);
    masterVolumeNode.gain.value = dbToGain(settings.volumeDb);

    if (distortionRouted !== settings.distortionEnabled) {
        reconnectOutputGraph(settings.distortionEnabled);
    }
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

    driveGainNode = audioContext.createGain();
    waveShaperNode = audioContext.createWaveShaper();
    distortionOutputGainNode = audioContext.createGain();
    masterVolumeNode = audioContext.createGain();

    let currentNode = sourceNode;
    for (const filter of filters) {
        currentNode.connect(filter);
        currentNode = filter;
    }

    reconnectOutputGraph(false);

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

        if (message.type === "OFFSCREEN_STOP") {
            await cleanup();
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
