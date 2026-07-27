import urllib.request
import json

with open("checkers_game.zip", "rb") as f:
    req = urllib.request.Request("https://api.anonfiles.com/upload", data={"file": f}, method="POST")
    try:
        response = urllib.request.urlopen(req)
        print(response.read().decode())
    except Exception as e:
        print(e)
