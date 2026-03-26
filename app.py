from flask import Flask, jsonify, render_template, request
from flask_cors import CORS

import backend

app = Flask(__name__)
CORS(app)


@app.get('/')
def index():
    return render_template('index.html')


@app.get('/stations')
def get_stations():
    country = request.args.get('country')
    if not country:
        return jsonify({'error': 'Не указан параметр country'}), 400

    return jsonify(backend.get_stations(country))


@app.get('/get_countries')
def get_countries():
    return jsonify(backend.get_countries())


@app.get('/get_schedule_for_one_station')
def get_schedule_for_one_station():
    code_station = request.args.get('code_station')
    date = request.args.get('date')

    if not code_station or not date:
        return jsonify({'error': 'Нужны параметры code_station и date'}), 400

    return jsonify(backend.get_schedule_for_one_station(code_station, date))


@app.get('/get_schedule_between_stations')
def get_schedule_between_stations():
    start_code_station = request.args.get('start_code_station')
    end_code_station = request.args.get('end_code_station')
    date = request.args.get('date')

    if not start_code_station or not end_code_station or not date:
        return jsonify({'error': 'Нужны параметры start_code_station, end_code_station и date'}), 400

    return jsonify(
        backend.get_schedule_between_stations(
            start_code_station=start_code_station,
            end_code_station=end_code_station,
            date=date,
        )
    )


if __name__ == '__main__':
    app.run(debug=True)
