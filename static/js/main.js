import { StationsApi } from './api.js';
import { createStationsMap } from './map.js';
import { renderBetweenStationsSchedule, renderSingleStationSchedule } from './render.js';
import { showMessage } from './utils.js';

const api = new StationsApi();

const state = {
    countries: [],
    stations: [],
    activeTab: 'main',
    mapReady: false,
};

const elements = {
    mainTabButton: document.getElementById('mainTabButton'),
    mapTabButton: document.getElementById('mapTabButton'),
    mainTab: document.getElementById('mainTab'),
    mapTab: document.getElementById('mapTab'),
    countryInput: document.getElementById('countryInput'),
    countriesList: document.getElementById('countriesList'),
    countryHint: document.getElementById('countryHint'),
    station1Input: document.getElementById('station1Input'),
    station2Input: document.getElementById('station2Input'),
    stationsList: document.getElementById('stationsList'),
    singleDate: document.getElementById('singleDate'),
    betweenDate: document.getElementById('betweenDate'),
    singleResult: document.getElementById('singleResult'),
    betweenResult: document.getElementById('betweenResult'),
    reloadStationsButton: document.getElementById('reloadStationsButton'),
    singleScheduleButton: document.getElementById('singleScheduleButton'),
    betweenScheduleButton: document.getElementById('betweenScheduleButton'),
    mapTargetGroup: document.getElementById('mapTargetGroup'),
    showStationsOnMapButton: document.getElementById('showStationsOnMapButton'),
    focusSelectedStationButton: document.getElementById('focusSelectedStationButton'),
    mapStatus: document.getElementById('mapStatus'),
    selectedMapStation: document.getElementById('selectedMapStation'),
    stationsMap: document.getElementById('stationsMap'),
    mapCountryPreview: document.getElementById('mapCountryPreview'),
    mapStationsCount: document.getElementById('mapStationsCount'),
};

let stationsMap = null;

function setToday() {
    const today = new Date().toISOString().split('T')[0];
    elements.singleDate.value = today;
    elements.betweenDate.value = today;
}

function fillDatalist(datalist, items, formatter) {
    datalist.innerHTML = items
        .map((item) => `<option value="${escapeHtml(formatter(item))}"></option>`)
        .join('');
}

function countryLabel(country) {
    return `${country.title} (${country.code})`;
}

function stationLabel(station) {
    return `${station.title} (${station.code})`;
}

function resolveCountryTitle(inputValue) {
    const trimmedValue = inputValue.trim();
    const exactMatch = state.countries.find(
        (country) => countryLabel(country) === trimmedValue || country.title === trimmedValue || country.code === trimmedValue,
    );
    if (exactMatch) {
        return exactMatch.title;
    }

    const partialMatches = state.countries.filter((country) => {
        const value = trimmedValue.toLowerCase();
        return country.title.toLowerCase().includes(value) || country.code.toLowerCase().includes(value);
    });

    return partialMatches.length === 1 ? partialMatches[0].title : '';
}

function resolveStation(inputValue) {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) {
        return null;
    }

    const exactMatch = state.stations.find(
        (station) => stationLabel(station) === trimmedValue || station.code === trimmedValue || station.title === trimmedValue,
    );
    if (exactMatch) {
        return exactMatch;
    }

    const partialMatches = state.stations.filter((station) => {
        const value = trimmedValue.toLowerCase();
        return station.title.toLowerCase().includes(value) || station.code.toLowerCase().includes(value);
    });

    return partialMatches.length === 1 ? partialMatches[0] : null;
}

function resolveStationCode(inputValue) {
    return resolveStation(inputValue)?.code || '';
}

function updateMapSummary() {
    const countryTitle = resolveCountryTitle(elements.countryInput.value);
    elements.mapCountryPreview.textContent = countryTitle || 'не выбрана';
    elements.mapStationsCount.textContent = String(state.stations.length);
}

function switchTab(tabName) {
    state.activeTab = tabName;

    const isMainTab = tabName === 'main';
    elements.mainTab.hidden = !isMainTab;
    elements.mapTab.hidden = isMainTab;
    elements.mainTab.classList.toggle('active', isMainTab);
    elements.mapTab.classList.toggle('active', !isMainTab);
    elements.mainTabButton.classList.toggle('active', isMainTab);
    elements.mapTabButton.classList.toggle('active', !isMainTab);
    elements.mainTabButton.setAttribute('aria-selected', String(isMainTab));
    elements.mapTabButton.setAttribute('aria-selected', String(!isMainTab));

    if (!isMainTab) {
        ensureMapReady();
        updateMapSummary();
    }
}

function getCurrentMapTarget() {
    const selected = elements.mapTargetGroup.querySelector('input[name="mapTarget"]:checked');
    return selected?.value || 'station1';
}

function getMapTargetInput() {
    return getCurrentMapTarget() === 'station2' ? elements.station2Input : elements.station1Input;
}

function applyStationFromMap(station) {
    const input = getMapTargetInput();
    input.value = stationLabel(station);
}

function ensureMapReady() {
    if (state.mapReady) {
        return;
    }

    try {
        stationsMap = createStationsMap({
            target: elements.stationsMap,
            statusElement: elements.mapStatus,
            selectedStationElement: elements.selectedMapStation,
            onStationSelected: applyStationFromMap,
        });
        state.mapReady = true;
        elements.mapStatus.textContent = 'Карта готова. Нажми «Показать станции на карте».';
        updateMapStations();
    } catch (error) {
        state.mapReady = false;
        elements.mapStatus.textContent = error instanceof Error ? error.message : 'Не удалось инициализировать карту.';
    }
}

function updateMapStations() {
    updateMapSummary();

    if (!state.mapReady || !stationsMap) {
        return;
    }

    if (!state.stations.length) {
        stationsMap.clearStations('Сначала выбери страну на основной вкладке и загрузи станции.');
        return;
    }

    stationsMap.setStations(state.stations);
    elements.mapStatus.textContent = `На карте подготовлено станций: ${state.stations.length}`;
}

async function loadCountries() {
    elements.countryHint.textContent = 'Загрузка стран...';
    state.countries = await api.getCountries();
    fillDatalist(elements.countriesList, state.countries, countryLabel);
    elements.countryHint.textContent = `Стран загружено: ${state.countries.length}`;

    if (!elements.countryInput.value && state.countries[0]) {
        elements.countryInput.value = countryLabel(state.countries[0]);
        await loadStationsBySelectedCountry();
    }

    updateMapSummary();
}

async function loadStationsBySelectedCountry() {
    const countryTitle = resolveCountryTitle(elements.countryInput.value);
    if (!countryTitle) {
        state.stations = [];
        elements.stationsList.innerHTML = '';
        elements.station1Input.value = '';
        elements.station2Input.value = '';
        elements.countryHint.textContent = 'Выбери страну из списка.';
        updateMapStations();
        return;
    }

    elements.countryHint.textContent = 'Загрузка станций...';
    state.stations = await api.getStations(countryTitle);
    fillDatalist(elements.stationsList, state.stations, stationLabel);
    elements.countryHint.textContent = `Станций загружено: ${state.stations.length}`;

    if (state.stations[0]) {
        elements.station1Input.value = stationLabel(state.stations[0]);
        elements.station2Input.value = stationLabel(state.stations[Math.min(1, state.stations.length - 1)]);
    }

    updateMapStations();
}

function focusCurrentStationOnMap() {
    ensureMapReady();
    if (!state.mapReady || !stationsMap) {
        return;
    }

    const station = resolveStation(getMapTargetInput().value);
    if (!station) {
        elements.mapStatus.textContent = 'Выбери станцию на основной вкладке или кликни по точке на карте.';
        return;
    }

    const focused = stationsMap.focusStation(station.code);
    if (!focused) {
        elements.mapStatus.textContent = 'У выбранной станции нет координат для показа на карте.';
    }
}

async function loadSingleStationSchedule() {
    const stationCode = resolveStationCode(elements.station1Input.value);
    const date = elements.singleDate.value;

    if (!stationCode || !date) {
        showMessage(elements.singleResult, 'Выбери станцию и дату.', 'error');
        return;
    }

    showMessage(elements.singleResult, 'Загрузка расписания...', 'empty');
    const data = await api.getScheduleForOneStation(stationCode, date);
    renderSingleStationSchedule(elements.singleResult, data);
}

async function loadBetweenStationsSchedule() {
    const startCode = resolveStationCode(elements.station1Input.value);
    const endCode = resolveStationCode(elements.station2Input.value);
    const date = elements.betweenDate.value;

    if (!startCode || !endCode || !date) {
        showMessage(elements.betweenResult, 'Выбери две станции и дату.', 'error');
        return;
    }

    showMessage(elements.betweenResult, 'Загрузка расписания...', 'empty');
    const data = await api.getScheduleBetweenStations(startCode, endCode, date);
    renderBetweenStationsSchedule(elements.betweenResult, data);
}

function bindEvents() {
    elements.mainTabButton.addEventListener('click', () => switchTab('main'));
    elements.mapTabButton.addEventListener('click', () => switchTab('map'));

    elements.countryInput.addEventListener('change', () => {
        loadStationsBySelectedCountry().catch(handleError);
    });
    elements.reloadStationsButton.addEventListener('click', () => {
        loadStationsBySelectedCountry().catch(handleError);
    });
    elements.singleScheduleButton.addEventListener('click', () => {
        loadSingleStationSchedule().catch(handleError);
    });
    elements.betweenScheduleButton.addEventListener('click', () => {
        loadBetweenStationsSchedule().catch(handleError);
    });

    elements.showStationsOnMapButton.addEventListener('click', () => {
        ensureMapReady();
        updateMapStations();
    });
    elements.focusSelectedStationButton.addEventListener('click', focusCurrentStationOnMap);
    elements.mapTargetGroup.addEventListener('change', () => {
        if (state.activeTab === 'map') {
            focusCurrentStationOnMap();
        }
    });
}

function handleError(error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Произошла неизвестная ошибка.';
    showMessage(elements.singleResult, message, 'error');
    showMessage(elements.betweenResult, message, 'error');
    elements.countryHint.textContent = message;
    elements.mapStatus.textContent = message;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

async function init() {
    setToday();
    bindEvents();
    switchTab('main');
    try {
        await loadCountries();
    } catch (error) {
        handleError(error);
    }
}

init();
