from pymongo import MongoClient

MONGO_URI = "mongodb+srv://posanirithwik:YrbvZGdqhQ6rMPqa@rishi.vxtdqzk.mongodb.net/whatsapp?retryWrites=true&w=majority&appName=Rishi"

client = MongoClient(MONGO_URI)
db = client['whatsapp']
collection = db['processed_messages']

# Find and update the latest "You" message to 'read'
latest = collection.find_one({"name": "You"}, sort=[("_id", -1)])

if latest:
    result = collection.update_one(
        {"_id": latest["_id"]},
        {"$set": {"status": "read"}}
    )
    print("✅ Updated message to READ status")
else:
    print("❌ No message found")
