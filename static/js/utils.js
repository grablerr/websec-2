export function formatTime(dateString) {
    if (!dateString) return '—';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDuration(seconds) {
    if (!seconds && seconds !== 0) return '—';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours} ч ${minutes} мин`;
    }

    return `${minutes} мин`;
}

export function showMessage(container, message, type = 'empty') {
    container.innerHTML = `<div class="${type}-message">${message}</div>`;
}

export function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
