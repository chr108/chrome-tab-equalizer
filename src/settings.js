export const BAND_FREQUENCIES = [60, 250, 1000, 4000, 8000];
export const STORAGE_KEY = "lastSettings";

/**
 * @typedef {Object} EqSettings
 * @property {boolean} enabled
 * @property {Record<number, number>} bands
 * @property {number} volumeDb
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
};

const clampDb = (value) => Math.max(-12, Math.min(12, value));

/**
 * @param {Partial<EqSettings> | undefined | null} value
 * @returns {EqSettings}
 */
export const normalizeSettings = (value) => {
    const safeBands = value?.bands ?? DEFAULT_SETTINGS.bands;

    return {
        enabled: value?.enabled ?? DEFAULT_SETTINGS.enabled,
        bands: {
            60: clampDb(Number(safeBands[60] ?? DEFAULT_SETTINGS.bands[60])),
            250: clampDb(Number(safeBands[250] ?? DEFAULT_SETTINGS.bands[250])),
            1000: clampDb(Number(safeBands[1000] ?? DEFAULT_SETTINGS.bands[1000])),
            4000: clampDb(Number(safeBands[4000] ?? DEFAULT_SETTINGS.bands[4000])),
            8000: clampDb(Number(safeBands[8000] ?? DEFAULT_SETTINGS.bands[8000])),
        },
        volumeDb: clampDb(Number(value?.volumeDb ?? DEFAULT_SETTINGS.volumeDb)),
    };
};
