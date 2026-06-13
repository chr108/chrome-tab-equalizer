export const BAND_FREQUENCIES = [60, 250, 1000, 4000, 8000];
export const STORAGE_KEY = "lastSettings";

/**
 * @typedef {"soft" | "hard"} DistortionMode
 */

/**
 * @typedef {Object} EqSettings
 * @property {boolean} enabled
 * @property {Record<number, number>} bands
 * @property {number} volumeDb
 * @property {boolean} distortionEnabled
 * @property {number} driveDb
 * @property {number} distortionAmount
 * @property {DistortionMode} distortionMode
 * @property {number} outputGainDb
 */

/** @type {EqSettings} */
export const DEFAULT_SETTINGS = {
    enabled: true,
    bands: {
        60: 0,
        250: 0,
        1000: 0,
        4000: 0,
        8000: 0,
    },
    volumeDb: 0,
    distortionEnabled: false,
    driveDb: 0,
    distortionAmount: 0,
    distortionMode: "soft",
    outputGainDb: 0,
};

const clampEqDb = (value) => Math.max(-12, Math.min(12, value));
const clampVolumeDb = (value) => Math.max(-12, Math.min(12, value));
const clampDriveDb = (value) => Math.max(0, Math.min(36, value));
const clampDistortionAmount = (value) => Math.max(0, Math.min(100, value));
const clampOutputGainDb = (value) => Math.max(-24, Math.min(6, value));

const toFiniteNumber = (value, fallback) => (Number.isFinite(value) ? value : fallback);

const normalizeMode = (value) => {
    if (typeof value === "string" && value.toLowerCase() === "hard") {
        return "hard";
    }

    return "soft";
};

/**
 * @param {Partial<EqSettings> | undefined | null} value
 * @returns {EqSettings}
 */
export const normalizeSettings = (value) => {
    const safeBands = value?.bands ?? DEFAULT_SETTINGS.bands;

    return {
        enabled: value?.enabled ?? DEFAULT_SETTINGS.enabled,
        bands: {
            60: clampEqDb(toFiniteNumber(Number(safeBands[60]), DEFAULT_SETTINGS.bands[60])),
            250: clampEqDb(toFiniteNumber(Number(safeBands[250]), DEFAULT_SETTINGS.bands[250])),
            1000: clampEqDb(toFiniteNumber(Number(safeBands[1000]), DEFAULT_SETTINGS.bands[1000])),
            4000: clampEqDb(toFiniteNumber(Number(safeBands[4000]), DEFAULT_SETTINGS.bands[4000])),
            8000: clampEqDb(toFiniteNumber(Number(safeBands[8000]), DEFAULT_SETTINGS.bands[8000])),
        },
        volumeDb: clampVolumeDb(toFiniteNumber(Number(value?.volumeDb), DEFAULT_SETTINGS.volumeDb)),
        distortionEnabled: value?.distortionEnabled ?? DEFAULT_SETTINGS.distortionEnabled,
        driveDb: clampDriveDb(toFiniteNumber(Number(value?.driveDb), DEFAULT_SETTINGS.driveDb)),
        distortionAmount: clampDistortionAmount(
            toFiniteNumber(Number(value?.distortionAmount), DEFAULT_SETTINGS.distortionAmount)
        ),
        distortionMode: normalizeMode(value?.distortionMode),
        outputGainDb: clampOutputGainDb(
            toFiniteNumber(Number(value?.outputGainDb), DEFAULT_SETTINGS.outputGainDb)
        ),
    };
};
