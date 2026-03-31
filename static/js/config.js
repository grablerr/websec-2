export const API_BASE_URL = resolveBaseUrl();

export const MAP_CONFIG = Object.freeze({
    defaultCenter: [37.6173, 55.7558],
    defaultZoom: 4,
    detailZoom: 13,
});

function resolveBaseUrl() {
    const configuredUrl = window.APP_CONFIG?.apiBaseUrl?.trim();
    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, '');
    }

    if (window.location.protocol === 'file:') {
        return 'http://127.0.0.1:5000';
    }

    return window.location.origin.replace(/\/$/, '');
}
