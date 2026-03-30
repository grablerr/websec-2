import os
from functools import lru_cache
from typing import Any
from urllib.parse import urlsplit

import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('YANDEX_RASP_API_KEY', '').strip()
YANDEX_API_URL = os.getenv(
    'YANDEX_API_URL', 'https://api.rasp.yandex-net.ru/v3.0/').rstrip('/') + '/'
TIMEOUT = int(os.getenv('YANDEX_TIMEOUT', '20'))
TRANSPORT_TYPES = {'suburban', 'train'}
FALLBACK_API_URLS = [
    'https://api.rasp.yandex-net.ru/v3.0/',
    'https://api.rasp.yandex.net/v3.0/',
]
CODE_SYSTEMS = (
    ('yandex_code', 'yandex'),
    ('esr_code', 'esr'),
    ('express_code', 'express'),
)


class BackendError(Exception):
    """Базовая ошибка backend-сервиса."""


class ConfigError(BackendError):
    """Ошибка конфигурации сервиса."""


class ExternalApiError(BackendError):
    """Ошибка внешнего API."""


class StationNotFoundError(ExternalApiError):
    """Станция не найдена или для нее нет расписания."""


class YandexRaspService:
    def __init__(self, api_key: str, base_url: str = YANDEX_API_URL, timeout: int = TIMEOUT) -> None:
        if not api_key:
            raise ConfigError(
                'Не задан YANDEX_RASP_API_KEY. Добавьте ключ в .env или в переменные окружения.'
            )
        self.api_key = api_key
        self.base_url = self._normalize_base_url(base_url)
        self.timeout = timeout
        self.session = requests.Session()

    @staticmethod
    def _normalize_base_url(base_url: str) -> str:
        normalized = (base_url or '').strip()
        if not normalized:
            normalized = FALLBACK_API_URLS[0]
        normalized = normalized.rstrip('/') + '/'
        return normalized.replace('api.rasp.yandex.net', 'api.rasp.yandex-net.ru')

    def _candidate_base_urls(self) -> list[str]:
        urls = [self.base_url]
        for url in FALLBACK_API_URLS:
            normalized = self._normalize_base_url(url)
            if normalized not in urls:
                urls.append(normalized)
        return urls

    def _request(self, endpoint: str, **params: Any) -> dict[str, Any]:
        query_params = {
            'apikey': self.api_key,
            'lang': 'ru_RU',
            'format': 'json',
            **params,
        }

        last_error: Exception | None = None
        for base_url in self._candidate_base_urls():
            try:
                response = self.session.get(
                    f'{base_url}{endpoint}',
                    params=query_params,
                    timeout=self.timeout,
                )
                if response.status_code == 404:
                    raise StationNotFoundError(
                        'Яндекс Расписания не нашли данные для выбранной станции или даты.'
                    )
                response.raise_for_status()
                payload = response.json()
            except StationNotFoundError:
                raise
            except requests.RequestException as exc:
                last_error = exc
                continue
            except ValueError as exc:
                raise ExternalApiError(
                    'API Яндекс Расписаний вернул некорректный JSON.') from exc

            if isinstance(payload, dict) and payload.get('error'):
                message = payload.get('error_text') or payload.get(
                    'description') or payload['error']
                raise ExternalApiError(str(message))

            return payload

        raise ExternalApiError(
            f'Ошибка запроса к API Яндекс Расписаний: {last_error}') from last_error

    @lru_cache(maxsize=1)
    def _station_codes_index(self) -> dict[str, dict[str, str]]:
        payload = self._request('stations_list/')
        index: dict[str, dict[str, str]] = {}

        for country in payload.get('countries', []):
            for region in country.get('regions', []):
                for settlement in region.get('settlements', []):
                    for station in settlement.get('stations', []):
                        codes = station.get('codes') or {}
                        yandex_code = codes.get('yandex_code')
                        if not yandex_code:
                            continue
                        index[yandex_code] = {
                            key: str(value)
                            for key, value in codes.items()
                            if value not in (None, '')
                        }

        return index

    @lru_cache(maxsize=1)
    def get_countries(self) -> list[dict[str, str]]:
        countries: list[dict[str, str]] = []
        payload = self._request('stations_list/')

        for country in payload.get('countries', []):
            codes = country.get('codes') or {}
            yandex_code = codes.get('yandex_code')
            title = country.get('title')
            if yandex_code and title:
                countries.append({'code': yandex_code, 'title': title})

        return sorted(countries, key=lambda item: item['title'])

    @lru_cache(maxsize=128)
    def get_stations(self, country_title: str) -> list[dict[str, str]]:
        payload = self._request('stations_list/')
        stations: list[dict[str, str]] = []

        for country in payload.get('countries', []):
            if country.get('title') != country_title:
                continue

            for region in country.get('regions', []):
                for settlement in region.get('settlements', []):
                    for station in settlement.get('stations', []):
                        if station.get('transport_type') not in TRANSPORT_TYPES:
                            continue
                        codes = station.get('codes') or {}
                        yandex_code = codes.get('yandex_code')
                        title = station.get('title')
                        latitude = normalize_coordinate(
                            station.get('latitude', station.get('lat'))
                        )
                        longitude = normalize_coordinate(
                            station.get('longitude', station.get('lng'))
                        )
                        if yandex_code and title:
                            station_payload = {
                                'code': yandex_code, 'title': title}
                            if latitude is not None and longitude is not None:
                                station_payload['latitude'] = latitude
                                station_payload['longitude'] = longitude
                            stations.append(station_payload)

            break

        unique_stations: dict[tuple[str, str], dict[str, Any]] = {}
        for item in stations:
            unique_stations[(item['code'], item['title'])] = item

        return sorted(unique_stations.values(), key=lambda item: item['title'])

    def get_schedule_for_one_station(self, code_station: str, date: str) -> dict[str, Any]:
        station_codes = self._station_codes_index().get(code_station, {})

        for code_key, system_name in CODE_SYSTEMS:
            station_value = station_codes.get(
                code_key) if station_codes else None
            if code_key == 'yandex_code' and not station_value:
                station_value = code_station
            if not station_value:
                continue

            request_params: dict[str, Any] = {
                'station': station_value,
                'date': date,
            }
            if system_name != 'yandex':
                request_params['system'] = system_name

            try:
                payload = self._request('schedule/', **request_params)
                return {
                    'station': payload.get('station', {}),
                    'schedule': payload.get('schedule', []),
                }
            except StationNotFoundError:
                continue

        raise ExternalApiError(
            'Для выбранной станции Яндекс Расписания не смогли найти расписание. Попробуй другую станцию.'
        )

    def get_schedule_between_stations(
        self,
        start_code_station: str,
        end_code_station: str,
        date: str,
    ) -> dict[str, Any]:
        payload = self._request(
            'search/', date=date, **{'from': start_code_station, 'to': end_code_station})
        return {
            'search': payload.get('search', {}),
            'schedule': payload.get('segments', []),
        }


@lru_cache(maxsize=1)
def get_service() -> YandexRaspService:
    return YandexRaspService(api_key=API_KEY)


def get_countries() -> list[dict[str, str]]:
    return get_service().get_countries()


def get_stations(pick_country: str) -> list[dict[str, str]]:
    return get_service().get_stations(pick_country)


def get_schedule_for_one_station(code_station: str, date: str) -> dict[str, Any]:
    return get_service().get_schedule_for_one_station(code_station, date)


def get_schedule_between_stations(start_code_station: str, end_code_station: str, date: str) -> dict[str, Any]:
    return get_service().get_schedule_between_stations(start_code_station, end_code_station, date)


def normalize_coordinate(value: Any) -> float | None:
    try:
        if value is None or value == '':
            return None
        return float(value)
    except (TypeError, ValueError):
        return None
