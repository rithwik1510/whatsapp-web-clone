from pymongo import MongoClient

MONGO_URI = "mongodb+srv://posanirithwik:YrbvZGdqhQ6rMPqa@rishi.vxtdqzk.mongodb.net/whatsapp?retryWrites=true&w=majority&appName=Rishi"
client = MongoClient(MONGO_URI)
db = client['whatsapp']
collection = db['processed_messages']

print("📋 Message Status Summary:\n")

cursor = collection.find({}, {"name": 1, "text": 1, "status": 1, "id": 1})
for doc in cursor:
    print(f"- From: {doc.get('name', '?')}")
    print(f"  ID: {doc.get('id', '')}")
    print(f"  Text: {doc.get('text', {}).get('body', '')}")
    print(f"  Status: {doc.get('status', 'N/A')}\n")
