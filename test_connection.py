from pymongo import MongoClient
from config import MONGO_URI

client = MongoClient(MONGO_URI)
db = client['whatsapp']
collection = db['processed_messages']

result = collection.insert_one({"test": "connection"})
print("✅ Successfully connected and inserted a test document!")
print("Inserted ID:", result.inserted_id)

