from functools import lru_cache
import api_key
import requests

API_KEY = api_key.API_KEY
YANDEX_API_URL = 'https://api.rasp.yandex-net.ru/v3.0/'
TIMEOUT = 20
TRANSPORT_TYPES = {'suburban', 'train'}


session = requests.Session()


def _get(endpoint: str, params: dict | None = None) -> dict:
    response = session.get(
        f'{YANDEX_API_URL}{endpoint}',
        params={
            'apikey': API_KEY,
            'lang': 'ru_RU',
            'format': 'json',
            **(params or {}),
        },
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


@lru_cache(maxsize=1)
def _stations_list() -> dict:
    return _get('stations_list/')


@lru_cache(maxsize=128)
def get_stations(pick_country: str) -> list[dict]:
    stations = []

    for country in _stations_list().get('countries', []):
        if country.get('title') != pick_country:
            continue

        for region in country.get('regions', []):
            for settlement in region.get('settlements', []):
                for station in settlement.get('stations', []):
                    if station.get('transport_type') not in TRANSPORT_TYPES:
                        continue

                    yandex_code = station.get('codes', {}).get('yandex_code')
                    title = station.get('title')
                    if not yandex_code or not title:
                        continue

                    stations.append({'code': yandex_code, 'title': title})

    return sorted(stations, key=lambda station: station['title'])


@lru_cache(maxsize=1)
def get_countries() -> list[dict]:
    countries = []

    for country in _stations_list().get('countries', []):
        country_code = country.get('codes', {}).get('yandex_code')
        title = country.get('title')
        if not country_code or not title:
            continue

        countries.append({'code': country_code, 'title': title})

    return sorted(countries, key=lambda item: item['title'])


def get_schedule_for_one_station(code_station: str, date: str) -> dict:
    schedule = _get('schedule/', params={'station': code_station, 'date': date})
    return {'station': schedule.get('station'), 'schedule': schedule.get('schedule', [])}



def get_schedule_between_stations(start_code_station: str, end_code_station: str, date: str) -> dict:
    schedule = _get(
        'search/',
        params={
            'from': start_code_station,
            'to': end_code_station,
            'date': date,
        },
    )
    return {'search': schedule.get('search'), 'schedule': schedule.get('segments', [])}
