@echo off
echo Installing requirements...
pip install -r requirements.txt
echo Starting Checkers Server...
start "" "http://127.0.0.1:5000"
python server.py
pause
