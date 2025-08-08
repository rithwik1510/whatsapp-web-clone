from pymongo import MongoClient

# Your MongoDB URI
MONGO_URI = "mongodb+srv://posanirithwik:YrbvZGdqhQ6rMPqa@rishi.vxtdqzk.mongodb.net/whatsapp?retryWrites=true&w=majority&appName=Rishi"

# Connect to the database
client = MongoClient(MONGO_URI)
db = client['whatsapp']
collection = db['processed_messages']

# Find all messages sent by "You"
messages = collection.find({"name": "You"})

# Display status of each message
print("\n📩 Your Sent Messages:\n")
for msg in messages:
    text = msg.get("text", {}).get("body")
    status = msg.get("status", "UNKNOWN")
    msg_id = msg.get("id", "NO_ID")
    print(f"• Message ID: {msg_id}\n  Text: {text}\n  Status: {status}\n")
