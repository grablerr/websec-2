import { APP_CONFIG } from './config.js';

export class StationsApi {
    constructor(basePath = APP_CONFIG.apiBaseUrl) {
        this.basePath = basePath;
    }

    async sendRequest(path, params = {}) {
        const url = new URL(`${this.basePath}${path}`);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });

        const response = await fetch(url.toString(), {
            headers: {
                Accept: 'application/json',
            },
        });

        let data = {};
        try {
            data = await response.json();
        } catch (error) {
            throw new Error('Сервер вернул не JSON-ответ.');
        }

        if (!response.ok) {
            throw new Error(data.error || `Ошибка HTTP ${response.status}`);
        }

        return data;
    }

    getCountries() {
        return this.sendRequest('/get_countries');
    }

    getStations(country) {
        return this.sendRequest('/stations', { country });
    }

    getScheduleForOneStation(code_station, date) {
        return this.sendRequest('/get_schedule_for_one_station', { code_station, date });
    }

    getScheduleBetweenStations(start_code_station, end_code_station, date) {
        return this.sendRequest('/get_schedule_between_stations', {
            start_code_station,
            end_code_station,
            date,
        });
    }
}
