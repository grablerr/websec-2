const elements = {
    country: document.getElementById('country'),
    countryOptions: document.getElementById('countryOptions'),
    station1: document.getElementById('station1'),
    station1Options: document.getElementById('station1Options'),
    station2: document.getElementById('station2'),
    station2Options: document.getElementById('station2Options'),
    singleDate: document.getElementById('singleDate'),
    betweenDate: document.getElementById('betweenDate'),
    singleResult: document.getElementById('singleResult'),
    betweenResult: document.getElementById('betweenResult'),
    loadCountriesBtn: document.getElementById('loadCountriesBtn'),
    loadStationsBtn: document.getElementById('loadStationsBtn'),
    loadSingleScheduleBtn: document.getElementById('loadSingleScheduleBtn'),
    loadBetweenScheduleBtn: document.getElementById('loadBetweenScheduleBtn'),
};

const state = {
    countries: [],
    stations: [],
};

const MESSAGES = {
    loading: 'Загрузка расписания...',
    selectCountry: 'Сначала выбери страну',
    selectSingle: 'Выбери станцию и дату',
    selectBetween: 'Выбери две станции и дату',
};

async function fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Не удалось получить данные');
    }

    return data;
}

function setLoading(container) {
    container.innerHTML = `<div class="empty-message">${MESSAGES.loading}</div>`;
}

function showError(container, message) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

function showEmpty(container, message) {
    container.innerHTML = `<div class="empty-message">${message}</div>`;
}

function normalize(value) {
    return String(value || '').trim().toLowerCase();
}

function getCountryLabel(country) {
    return `${country.title} (${country.code})`;
}

function getStationLabel(station) {
    return `${station.title} (${station.code})`;
}

function fillDatalist(datalistElement, items, getLabel) {
    datalistElement.innerHTML = '';

    items.forEach((item) => {
        const option = document.createElement('option');
        option.value = getLabel(item);
        datalistElement.appendChild(option);
    });
}

function resolveItem(inputValue, items, getLabel) {
    const query = normalize(inputValue);
    if (!query) {
        return null;
    }

    const exactMatch = items.find((item) => {
        const label = normalize(getLabel(item));
        const title = normalize(item.title);
        const code = normalize(item.code);
        return query === label || query === title || query === code;
    });

    if (exactMatch) {
        return exactMatch;
    }

    const partialMatches = items.filter((item) => {
        const label = normalize(getLabel(item));
        const title = normalize(item.title);
        const code = normalize(item.code);
        return label.includes(query) || title.includes(query) || code.includes(query);
    });

    return partialMatches.length === 1 ? partialMatches[0] : null;
}

function syncInputWithResolvedValue(inputElement, item, getLabel) {
    if (item) {
        inputElement.value = getLabel(item);
    }
}

function formatTime(dateString) {
    if (!dateString) {
        return '—';
    }

    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDuration(seconds) {
    if (seconds === null || seconds === undefined) {
        return '—';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return hours > 0 ? `${hours} ч ${minutes} мин` : `${minutes} мин`;
}

function renderSingleStationSchedule(data) {
    if (!data.schedule || data.schedule.length === 0) {
        showEmpty(elements.singleResult, 'На выбранную дату для этой станции расписание не найдено.');
        return;
    }

    const stationTitle = data.station?.title || 'Станция не указана';

    const cards = data.schedule.map((item) => {
        const trainNumber = item.thread?.number || 'Без номера';
        const trainTitle = item.thread?.title || 'Маршрут не указан';
        const trainType = item.thread?.transport_subtype?.title || item.thread?.transport_type || 'Поезд';
        const carrier = item.thread?.carrier?.title || 'Не указан';
        const arrival = formatTime(item.arrival);
        const departure = formatTime(item.departure);
        const days = item.days || 'Не указано';
        const platform = item.platform?.trim() ? item.platform : 'Не указана';
        const stops = item.stops || 'Нет данных';

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

    elements.singleResult.innerHTML = `
        <div class="station-title-box">📍 Расписание по станции: ${stationTitle}</div>
        <div class="station-schedule-list">${cards}</div>
    `;
}

function renderBetweenStationsSchedule(data) {
    if (!data.schedule || data.schedule.length === 0) {
        showEmpty(elements.betweenResult, 'На выбранную дату рейсов между этими станциями не найдено.');
        return;
    }

    const cards = data.schedule.map((item) => {
        const trainNumber = item.thread?.number || 'Без номера';
        const trainTitle = item.thread?.title || 'Маршрут не указан';
        const trainType = item.thread?.transport_subtype?.title || item.thread?.transport_type || 'Поезд';
        const carrier = item.thread?.carrier?.title || 'Не указан';
        const fromStation = item.from?.title || 'Не указано';
        const toStation = item.to?.title || 'Не указано';
        const departure = formatTime(item.departure);
        const arrival = formatTime(item.arrival);
        const duration = formatDuration(item.duration);
        const stops = item.stops || 'Нет данных';
        const transfers = item.has_transfers ? 'Есть' : 'Нет';

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
                        ${item.start_date || 'Не указана'}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    elements.betweenResult.innerHTML = `<div class="trip-list">${cards}</div>`;
}

async function loadCountries() {
    try {
        state.countries = await fetchJson('/get_countries');
        fillDatalist(elements.countryOptions, state.countries, getCountryLabel);
    } catch (error) {
        alert(error.message);
    }
}

async function loadStations() {
    const selectedCountry = resolveItem(elements.country.value, state.countries, getCountryLabel);
    if (!selectedCountry) {
        alert('Выбери страну из предложенного списка');
        return;
    }

    syncInputWithResolvedValue(elements.country, selectedCountry, getCountryLabel);

    try {
        state.stations = await fetchJson(`/stations?country=${encodeURIComponent(selectedCountry.title)}`);
        fillDatalist(elements.station1Options, state.stations, getStationLabel);
        fillDatalist(elements.station2Options, state.stations, getStationLabel);
        elements.station1.value = '';
        elements.station2.value = '';
    } catch (error) {
        alert(error.message);
    }
}

async function loadSingleStationSchedule() {
    const station = resolveItem(elements.station1.value, state.stations, getStationLabel);
    const date = elements.singleDate.value;

    if (!station || !date) {
        alert(MESSAGES.selectSingle);
        return;
    }

    syncInputWithResolvedValue(elements.station1, station, getStationLabel);
    setLoading(elements.singleResult);

    try {
        const data = await fetchJson(
            `/get_schedule_for_one_station?code_station=${encodeURIComponent(station.code)}&date=${encodeURIComponent(date)}`
        );
        renderSingleStationSchedule(data);
    } catch (error) {
        showError(elements.singleResult, `Ошибка при загрузке данных: ${error.message}`);
    }
}

async function loadBetweenStationsSchedule() {
    const startStation = resolveItem(elements.station1.value, state.stations, getStationLabel);
    const endStation = resolveItem(elements.station2.value, state.stations, getStationLabel);
    const date = elements.betweenDate.value;

    if (!startStation || !endStation || !date) {
        alert(MESSAGES.selectBetween);
        return;
    }

    syncInputWithResolvedValue(elements.station1, startStation, getStationLabel);
    syncInputWithResolvedValue(elements.station2, endStation, getStationLabel);
    setLoading(elements.betweenResult);

    try {
        const data = await fetchJson(
            `/get_schedule_between_stations?start_code_station=${encodeURIComponent(startStation.code)}&end_code_station=${encodeURIComponent(endStation.code)}&date=${encodeURIComponent(date)}`
        );
        renderBetweenStationsSchedule(data);
    } catch (error) {
        showError(elements.betweenResult, `Ошибка при загрузке данных: ${error.message}`);
    }
}

elements.loadCountriesBtn.addEventListener('click', loadCountries);
elements.loadStationsBtn.addEventListener('click', loadStations);
elements.loadSingleScheduleBtn.addEventListener('click', loadSingleStationSchedule);
elements.loadBetweenScheduleBtn.addEventListener('click', loadBetweenStationsSchedule);
