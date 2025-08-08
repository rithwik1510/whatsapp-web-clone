# config.py
import os

# Read from environment. Set this on your hosting platform.
MONGO_URI = os.environ.get("MONGO_URI", "")
