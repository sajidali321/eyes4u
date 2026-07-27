import requests
import json
import random
import string
bin_id = ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(16))
res = requests.post(f"https://filebin.net/{bin_id}/checkers_game.zip", data=open("checkers_game.zip", "rb"), headers={"filename": "checkers_game.zip"})
print(f"URL: https://filebin.net/{bin_id}/checkers_game.zip")
