const DEFAULT_CENTER = [37.6173, 55.7558];
const DEFAULT_ZOOM = 4;
const DETAIL_ZOOM = 13;

export function createStationsMap({
    target,
    statusElement,
    selectedStationElement,
    onStationSelected,
}) {
    ensureOpenLayers();

    const rasterLayer = new ol.layer.Tile({
        source: new ol.source.OSM(),
    });

    const vectorSource = new ol.source.Vector();
    const vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: featureStyle,
    });

    const map = new ol.Map({
        target,
        layers: [rasterLayer, vectorLayer],
        view: new ol.View({
            center: ol.proj.fromLonLat(DEFAULT_CENTER),
            zoom: DEFAULT_ZOOM,
        }),
    });

    const state = {
        stations: [],
        featuresByCode: new Map(),
        selectedCode: null,
    };

    map.on('click', (event) => {
        const feature = map.forEachFeatureAtPixel(event.pixel, (candidate) => candidate);
        if (!feature) {
            return;
        }

        const station = feature.get('station');
        if (!station) {
            return;
        }

        selectStation(station);
        onStationSelected?.(station);
    });

    function clearStations(message = 'Для выбранной страны нет координат станций для отображения на карте.') {
        vectorSource.clear();
        state.featuresByCode.clear();
        state.stations = [];
        state.selectedCode = null;
        statusElement.textContent = message;
        renderSelectedStation(selectedStationElement, null);
        resetView();
    }

    function setStations(stations = []) {
        const stationsWithCoords = stations.filter(hasCoordinates);
        if (!stationsWithCoords.length) {
            clearStations();
            return;
        }

        vectorSource.clear();
        state.featuresByCode.clear();
        state.stations = stationsWithCoords;
        state.selectedCode = null;

        const extent = ol.extent.createEmpty();

        stationsWithCoords.forEach((station) => {
            const point = ol.proj.fromLonLat([station.longitude, station.latitude]);
            const feature = new ol.Feature({
                geometry: new ol.geom.Point(point),
                station,
            });
            feature.setId(station.code);
            vectorSource.addFeature(feature);
            state.featuresByCode.set(station.code, feature);
            ol.extent.extend(extent, feature.getGeometry().getExtent());
        });

        map.getView().fit(extent, {
            padding: [40, 40, 40, 40],
            maxZoom: 10,
            duration: 250,
        });

        statusElement.textContent = `На карте показано станций: ${stationsWithCoords.length}`;
        renderSelectedStation(selectedStationElement, null);
    }

    function focusStation(stationCode) {
        const feature = state.featuresByCode.get(stationCode);
        if (!feature) {
            return false;
        }

        const station = feature.get('station');
        state.selectedCode = station.code;
        vectorLayer.changed();
        renderSelectedStation(selectedStationElement, station);

        map.getView().animate({
            center: feature.getGeometry().getCoordinates(),
            zoom: Math.max(map.getView().getZoom() || DEFAULT_ZOOM, DETAIL_ZOOM),
            duration: 250,
        });
        return true;
    }

    function selectStation(station) {
        state.selectedCode = station.code;
        vectorLayer.changed();
        renderSelectedStation(selectedStationElement, station);
    }

    function resetView() {
        map.getView().setCenter(ol.proj.fromLonLat(DEFAULT_CENTER));
        map.getView().setZoom(DEFAULT_ZOOM);
    }

    function hasStation(stationCode) {
        return state.featuresByCode.has(stationCode);
    }

    return {
        setStations,
        clearStations,
        focusStation,
        hasStation,
    };

    function featureStyle(feature) {
        const station = feature.get('station');
        const isSelected = station?.code === state.selectedCode;

        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: isSelected ? 8 : 5,
                fill: new ol.style.Fill({
                    color: isSelected ? '#d62828' : '#2d89ef',
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffffff',
                    width: 2,
                }),
            }),
        });
    }
}

function renderSelectedStation(container, station) {
    if (!station) {
        container.className = 'selected-map-station empty-message';
        container.innerHTML = 'Здесь будет информация о станции, выбранной на карте.';
        return;
    }

    container.className = 'selected-map-station';
    container.innerHTML = `
        <div class="selected-map-station-title">📍 ${station.title}</div>
        <div class="selected-map-station-meta">Код: ${station.code}</div>
        <div class="selected-map-station-meta">Координаты: ${station.latitude.toFixed(5)}, ${station.longitude.toFixed(5)}</div>
    `;
}

function hasCoordinates(station) {
    return Number.isFinite(station?.latitude) && Number.isFinite(station?.longitude);
}

function ensureOpenLayers() {
    if (!window.ol) {
        throw new Error('Не удалось загрузить OpenLayers. Проверь подключение к сети и обнови страницу.');
    }
}
