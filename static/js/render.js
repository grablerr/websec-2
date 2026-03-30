import { escapeHtml, formatDuration, formatTime, showMessage } from './utils.js';

export function renderSingleStationSchedule(container, data) {
    if (data.error) {
        showMessage(container, escapeHtml(data.error), 'error');
        return;
    }

    if (!data.schedule || data.schedule.length === 0) {
        showMessage(container, 'На выбранную дату для этой станции расписание не найдено.', 'empty');
        return;
    }

    const stationTitle = escapeHtml(data.station?.title || 'Станция не указана');

    const cards = data.schedule.map((item) => {
        const trainNumber = escapeHtml(item.thread?.number || 'Без номера');
        const trainTitle = escapeHtml(item.thread?.title || 'Маршрут не указан');
        const trainType = escapeHtml(item.thread?.transport_subtype?.title || item.thread?.transport_type || 'Поезд');
        const carrier = escapeHtml(item.thread?.carrier?.title || 'Не указан');
        const arrival = escapeHtml(formatTime(item.arrival));
        const departure = escapeHtml(formatTime(item.departure));
        const days = escapeHtml(item.days || 'Не указано');
        const platform = escapeHtml(item.platform && item.platform.trim() ? item.platform : 'Не указана');
        const stops = escapeHtml(item.stops || 'Нет данных');

        return `
            <div class="station-card">
                <div class="station-card-header">
                    <div class="station-train-title">🚆 ${trainNumber} — ${trainTitle}</div>
                    <div class="station-route-badge">${trainType}</div>
                </div>

                <div class="station-time-row">
                    <div class="station-time-box">
                        <div class="station-time-label">Прибытие</div>
                        <div class="station-time-main">${arrival}</div>
                    </div>

                    <div class="station-time-box">
                        <div class="station-time-label">Отправление</div>
                        <div class="station-time-main">${departure}</div>
                    </div>
                </div>

                <div class="station-meta-grid">
                    <div class="station-meta-item">
                        <span class="station-meta-label">Перевозчик</span>
                        ${carrier}
                    </div>
                    <div class="station-meta-item">
                        <span class="station-meta-label">Дни следования</span>
                        ${days}
                    </div>
                    <div class="station-meta-item">
                        <span class="station-meta-label">Платформа</span>
                        ${platform}
                    </div>
                    <div class="station-meta-item">
                        <span class="station-meta-label">Остановки</span>
                        ${stops}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="station-title-box">📍 Расписание по станции: ${stationTitle}</div>
        <div class="station-schedule-list">${cards}</div>
    `;
}

export function renderBetweenStationsSchedule(container, data) {
    if (data.error) {
        showMessage(container, escapeHtml(data.error), 'error');
        return;
    }

    if (!data.schedule || data.schedule.length === 0) {
        showMessage(container, 'На выбранную дату рейсов между этими станциями не найдено.', 'empty');
        return;
    }

    const cards = data.schedule.map((item) => {
        const trainNumber = escapeHtml(item.thread?.number || 'Без номера');
        const trainTitle = escapeHtml(item.thread?.title || 'Маршрут не указан');
        const trainType = escapeHtml(item.thread?.transport_subtype?.title || item.thread?.transport_type || 'Поезд');
        const carrier = escapeHtml(item.thread?.carrier?.title || 'Не указан');
        const fromStation = escapeHtml(item.from?.title || 'Не указано');
        const toStation = escapeHtml(item.to?.title || 'Не указано');
        const departure = escapeHtml(formatTime(item.departure));
        const arrival = escapeHtml(formatTime(item.arrival));
        const duration = escapeHtml(formatDuration(item.duration));
        const stops = escapeHtml(item.stops || 'Нет данных');
        const transfers = item.has_transfers ? 'Есть' : 'Нет';
        const startDate = escapeHtml(item.start_date || 'Не указана');

        return `
            <div class="trip-card">
                <div class="trip-header">
                    <div class="train-title">🚆 ${trainNumber} — ${trainTitle}</div>
                    <div class="train-badge">${trainType}</div>
                </div>

                <div class="trip-times">
                    <div class="time-box">
                        <div class="time-main">${departure}</div>
                        <div class="station-name">${fromStation}</div>
                        <div class="station-sub">Отправление</div>
                    </div>

                    <div class="trip-duration">⏱ ${duration}</div>

                    <div class="time-box">
                        <div class="time-main">${arrival}</div>
                        <div class="station-name">${toStation}</div>
                        <div class="station-sub">Прибытие</div>
                    </div>
                </div>

                <div class="trip-meta">
                    <div class="meta-item">
                        <span class="meta-label">Перевозчик</span>
                        ${carrier}
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Пересадки</span>
                        ${transfers}
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Остановки</span>
                        ${stops}
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Дата рейса</span>
                        ${startDate}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="trip-list">${cards}</div>`;
}
