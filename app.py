import os
from http import HTTPStatus

from flask import Flask, jsonify, render_template, request
from flask_cors import CORS

import backend
from backend import BackendError, ConfigError, ExternalApiError

APP_HOST = os.getenv('APP_HOST', '127.0.0.1')
APP_PORT = int(os.getenv('APP_PORT', '5000'))
APP_DEBUG = os.getenv('APP_DEBUG', 'true').lower() == 'true'
API_BASE_URL = os.getenv('API_BASE_URL', f'http://{APP_HOST}:{APP_PORT}')

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)


def json_error(message: str, status: HTTPStatus) -> tuple:
    return jsonify({'error': message}), status


@app.errorhandler(ConfigError)
def handle_config_error(error: ConfigError):
    return json_error(str(error), HTTPStatus.INTERNAL_SERVER_ERROR)


@app.errorhandler(ExternalApiError)
def handle_external_api_error(error: ExternalApiError):
    return json_error(str(error), HTTPStatus.BAD_GATEWAY)


@app.errorhandler(BackendError)
def handle_backend_error(error: BackendError):
    return json_error(str(error), HTTPStatus.INTERNAL_SERVER_ERROR)


@app.route('/')
def index():
    return render_template('index.html', api_base_url=API_BASE_URL)


@app.get('/stations')
def get_stations():
    country = request.args.get('country', '').strip()
    if not country:
        return json_error('Не указан параметр country', HTTPStatus.BAD_REQUEST)
    return jsonify(backend.get_stations(country))


@app.get('/get_countries')
def get_countries():
    return jsonify(backend.get_countries())


@app.get('/get_schedule_for_one_station')
def get_schedule_for_one_station():
    code_station = request.args.get('code_station', '').strip()
    date = request.args.get('date', '').strip()

    if not code_station or not date:
        return json_error('Нужны параметры code_station и date', HTTPStatus.BAD_REQUEST)

    return jsonify(backend.get_schedule_for_one_station(code_station, date))


@app.get('/get_schedule_between_stations')
def get_schedule_between_stations():
    start_code_station = request.args.get('start_code_station', '').strip()
    end_code_station = request.args.get('end_code_station', '').strip()
    date = request.args.get('date', '').strip()

    if not start_code_station or not end_code_station or not date:
        return json_error(
            'Нужны параметры start_code_station, end_code_station и date',
            HTTPStatus.BAD_REQUEST,
        )

    return jsonify(
        backend.get_schedule_between_stations(
            start_code_station=start_code_station,
            end_code_station=end_code_station,
            date=date,
        )
    )


if __name__ == '__main__':
    app.run(host=APP_HOST, port=APP_PORT, debug=APP_DEBUG)
