export const APP_CONFIG = {
    apiBaseUrl: resolveBaseUrl(),
};

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
