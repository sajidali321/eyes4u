from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import socket
import logging

# Suppress werkzeug logging for cleaner terminal output
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# Simple memory storage for rooms
rooms = {}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def test_connect():
    pass

@socketio.on('create_room')
def on_create_room(data):
    room = data.get('room')
    rules = data.get('rules')
    if room not in rooms:
        rooms[room] = {'players': [request.sid], 'rules': rules, 'state': None}
        join_room(room)
        emit('room_created', {'room': room, 'message': f'Room {room} created. Waiting for opponent...'})
    else:
        emit('error', {'message': 'Room already exists.'})

@socketio.on('join_room')
def on_join_room(data):
    room = data.get('room')
    if room in rooms:
        if len(rooms[room]['players']) < 2:
            rooms[room]['players'].append(request.sid)
            join_room(room)
            rules = rooms[room]['rules']
            emit('room_joined', {'room': room, 'rules': rules, 'message': 'Joined room! Game starting...'})
            socketio.emit('game_start', {'rules': rules}, room=room)
        else:
            emit('error', {'message': 'Room is full.'})
    else:
        emit('error', {'message': 'Room does not exist.'})

@socketio.on('move')
def on_move(data):
    room = data.get('room')
    move_data = data.get('move_data')
    # Broadcast the move to the other player in the room
    emit('opponent_moved', move_data, room=room, include_self=False)

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == '__main__':
    ip = get_local_ip()
    print("=====================================================")
    print("   CHECKERS GAME SERVER STARTED")
    print("=====================================================")
    print(f"To play locally on this computer, open your browser and go to:")
    print(f"  --> http://127.0.0.1:5000")
    print(f"To play with a friend on LAN (WiFi), tell them to go to:")
    print(f"  --> http://{ip}:5000")
    print("=====================================================")
    print("Press Ctrl+C to stop the server.")
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
