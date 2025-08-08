import os
import json
from pymongo import MongoClient
from config import MONGO_URI

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client['whatsapp']
collection = db['processed_messages']

# Folder containing payload JSONs
payload_folder = "payloads"

def process_json_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as file:
        try:
            data = json.load(file)
        except json.JSONDecodeError:
            print(f"Failed to parse {filepath}")
            return

    entry = data.get("metaData", {}).get("entry", [])
    if not entry:
        print(f"No entry found in {filepath}")
        return

    changes = entry[0].get("changes", [])
    if not changes:
        print(f"No changes found in {filepath}")
        return

    value = changes[0].get("value", {})
    messages = value.get("messages", [])
    statuses = value.get("statuses", [])
    contacts = value.get("contacts", [{}])[0]
    wa_id = contacts.get("wa_id", "unknown")
    profile_name = contacts.get("profile", {}).get("name", "Unknown")

    print(f"Found messages: {len(messages)}, statuses: {len(statuses)}")

    # Insert new messages
    for msg in messages:
        msg_id = msg.get("id")
        msg['wa_id'] = wa_id
        msg['name'] = profile_name
        msg['status'] = 'sent'  # default

        # Also save wamid (standardized ID format)
        msg['wamid'] = msg_id

        existing = collection.find_one({ "wamid": msg_id })
        if not existing:
            collection.insert_one(msg)
            print(f"Inserted message {msg_id}")
        else:
            print(f"Message {msg_id} already exists, skipping.")

    # Update statuses
    for status in statuses:
        meta_id = status.get("id") or status.get("meta", {}).get("meta_msg_id")
        new_status = status.get("status")
        if meta_id and new_status:
            result = collection.update_one(
                { "wamid": meta_id },
                { "$set": { "status": new_status } }
            )
            if result.matched_count:
                print(f"Updated message {meta_id} to status {new_status}")
            else:
                print(f"No message found for status update: {meta_id}")

# Run processor
for filename in os.listdir(payload_folder):
    if filename.endswith(".json"):
        filepath = os.path.join(payload_folder, filename)
        print("\n")
        print("Processing " + filename + "...")
        process_json_file(filepath)
