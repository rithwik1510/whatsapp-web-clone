import os
import json
import time
from flask import Flask, jsonify, request, send_from_directory, Response, stream_with_context
from flask_socketio import SocketIO
from flask_cors import CORS
from pymongo import MongoClient
from config import MONGO_URI
from datetime import datetime
import queue
from bson import json_util

# Initialize Flask app
app = Flask(__name__, static_folder='Frontened', static_url_path='/Frontened')
CORS(app)  # Allow cross-origin requests for frontend
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    print(f"✅ Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"❌ Client disconnected: {request.sid}")

@socketio.on('typing_start')
def handle_typing_start(data):
    socketio.emit('typing_start', data, broadcast=True, include_self=False)

@socketio.on('typing_stop')
def handle_typing_stop(data):
    socketio.emit('typing_stop', data, broadcast=True, include_self=False)

# Connect to MongoDB
try:
    client = MongoClient(MONGO_URI)
    # Test the connection
    client.admin.command('ping')
    print("✅ MongoDB connected successfully")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    # Create a fallback for demo purposes
    client = None

db = client['whatsapp'] if client else None
collection = db['processed_messages'] if db else None

PAYLOADS_DIR = 'payloads'

# In-memory queue for SSE events
event_queue = queue.Queue()

def get_contacts_from_json_files():
    contacts = {}
    print(f"Scanning directory: {PAYLOADS_DIR}")
    for filename in os.listdir(PAYLOADS_DIR):
        if filename.endswith('.json'):
            filepath = os.path.join(PAYLOADS_DIR, filename)
            print(f"Processing file: {filename}")
            with open(filepath, 'r') as f:
                try:
                    data = json.load(f)
                    if isinstance(data, dict) and 'metaData' in data and isinstance(data['metaData'], dict) and 'entry' in data['metaData'] and isinstance(data['metaData']['entry'], list):
                        for entry in data['metaData']['entry']:
                            if isinstance(entry, dict) and 'changes' in entry and isinstance(entry['changes'], list):
                                for change in entry['changes']:
                                    if isinstance(change, dict) and 'value' in change and isinstance(change['value'], dict) and 'contacts' in change['value'] and isinstance(change['value']['contacts'], list):
                                        for contact_info in change['value']['contacts']:
                                            if isinstance(contact_info, dict):
                                                wa_id = contact_info.get('wa_id')
                                                profile = contact_info.get('profile', {})
                                                name = profile.get('name')
                                                if wa_id and name and wa_id not in contacts:
                                                    contacts[wa_id] = {'wa_id': wa_id, 'name': name}
                                                    print(f"Found contact: {name} ({wa_id})")
                except json.JSONDecodeError:
                    print(f"Error decoding JSON from {filename}")
                except Exception as e:
                    print(f"An unexpected error occurred while processing {filename}: {e}")
    
    result = list(contacts.values())
    print(f"Total contacts found: {len(result)}")
    return result

def bootstrap_db_from_payloads_if_empty():
    if not collection:
        print("❌ MongoDB not available, skipping bootstrap")
        return
        
    try:
        if collection.estimated_document_count() > 0:
            return
    except Exception:
        # If count fails, try anyway
        pass

    # Minimal ingestion similar to process_payloads.py, but safe in-app
    try:
        for filename in os.listdir(PAYLOADS_DIR):
            if not filename.endswith('.json'):
                continue
            filepath = os.path.join(PAYLOADS_DIR, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    print(f"Failed to parse {filename}")
                    continue

            entry = data.get('metaData', {}).get('entry', [])
            if not entry:
                continue
            for ent in entry:
                changes = ent.get('changes', []) or []
                for change in changes:
                    value = change.get('value', {}) or {}
                    contacts = (value.get('contacts') or [{}])
                    first_contact = contacts[0] if contacts else {}
                    wa_id = first_contact.get('wa_id') or 'unknown'
                    profile_name = (first_contact.get('profile') or {}).get('name') or 'Unknown'

                    # Insert messages
                    for msg in value.get('messages', []) or []:
                        msg_id = msg.get('id')
                        if not msg_id:
                            continue
                        msg['wa_id'] = wa_id
                        msg['name'] = profile_name
                        msg['status'] = msg.get('status') or 'sent'
                        msg['wamid'] = msg_id

                        # Check if message already exists
                        existing = collection.find_one({"wamid": msg_id})
                        if not existing:
                            collection.insert_one(msg)
                            print(f"Inserted message {msg_id}")

                    # Update statuses
                    for status in value.get('statuses', []) or []:
                        meta_id = status.get("id") or status.get("meta", {}).get("meta_msg_id")
                        new_status = status.get("status")
                        if meta_id and new_status:
                            result = collection.update_one(
                                {"wamid": meta_id},
                                {"$set": {"status": new_status}}
                            )
                            if result.matched_count:
                                print(f"Updated message {meta_id} to status {new_status}")
    except Exception as e:
        print(f"❌ Bootstrap error: {e}")


@app.route('/')
def serve_index():
    return send_from_directory('Frontened', 'index.html')

@app.route('/test')
def test():
    return jsonify({"status": "ok", "message": "Flask app is working", "mongo_connected": collection is not None})

def get_messages_from_payloads(wa_id: str):
    messages = []
    try:
        for filename in os.listdir(PAYLOADS_DIR):
            if not filename.endswith('.json'):
                continue
            filepath = os.path.join(PAYLOADS_DIR, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    continue
            for ent in (data.get('metaData', {}).get('entry', []) or []):
                for change in (ent.get('changes', []) or []):
                    value = change.get('value', {}) or {}
                    contacts = (value.get('contacts') or [{}])
                    first_contact = contacts[0] if contacts else {}
                    file_wa_id = first_contact.get('wa_id')
                    name = (first_contact.get('profile') or {}).get('name') or 'Unknown'
                    if not file_wa_id or file_wa_id != wa_id:
                        continue
                    for msg in (value.get('messages') or []):
                        m = dict(msg)
                        m['wa_id'] = wa_id
                        m['name'] = name
                        m['wamid'] = msg.get('id')
                        m['status'] = m.get('status') or 'sent'
                        messages.append(m)
        # sort by timestamp if present
        def to_num(ts):
            try:
                return float(ts)
            except Exception:
                return 0.0
        messages.sort(key=lambda m: to_num(m.get('timestamp')), reverse=False)
    except Exception as e:
        print(f"Failed to read messages from payloads: {e}")
    return messages


@app.route('/chats', methods=['GET'])
def get_chats():
    print("=== /chats endpoint called ===")
    try:
        # Ensure DB has messages from payloads on first run
        bootstrap_db_from_payloads_if_empty()
        
        # Check if MongoDB is available
        if not collection:
            print("❌ MongoDB not available, using fallback data")
            # Return fallback data from JSON files
            json_contacts = get_contacts_from_json_files()
            fallback_chats = []
            for contact in json_contacts:
                fallback_chats.append({
                    "wa_id": contact['wa_id'],
                    "name": contact['name'],
                    "last_message": "Demo message",
                    "last_timestamp": "1754400000",
                    "unread_count": 0
                })
            print(f"Returning {len(fallback_chats)} fallback chats")
            return jsonify(fallback_chats)
        
        # Since MongoDB Atlas doesn't allow aggregation, we'll use a simple approach
        # Get all documents and process them in Python
        all_docs = list(collection.find())
        print(f"Total documents in MongoDB: {len(all_docs)}")
        
        mongo_chats = []
        chat_groups = {}
        
        for doc in all_docs:
            wa_id = doc.get('wa_id')
            if not wa_id:
                continue
                
            if wa_id not in chat_groups:
                chat_groups[wa_id] = {
                    '_id': wa_id,
                    'name': doc.get('name', 'Unknown'),
                    'last_message': doc.get('text', {}).get('body', ''),
                    'last_timestamp': doc.get('timestamp', 0),
                    'unread_count': 0
                }
            else:
                # Update with more recent message if available
                current_timestamp = doc.get('timestamp', 0)
                stored_timestamp = chat_groups[wa_id].get('last_timestamp', 0)
                
                # Ensure both are numbers for comparison
                if isinstance(current_timestamp, str):
                    try:
                        current_timestamp = float(current_timestamp)
                    except (ValueError, TypeError):
                        current_timestamp = 0
                        
                if isinstance(stored_timestamp, str):
                    try:
                        stored_timestamp = float(stored_timestamp)
                    except (ValueError, TypeError):
                        stored_timestamp = 0
                
                if current_timestamp > stored_timestamp:
                    chat_groups[wa_id]['last_message'] = doc.get('text', {}).get('body', '')
                    chat_groups[wa_id]['last_timestamp'] = current_timestamp
                
                # Count unread messages
                if doc.get('status') != 'read':
                    chat_groups[wa_id]['unread_count'] += 1
        
        mongo_chats = list(chat_groups.values())
        print(f"MongoDB chats found: {len(mongo_chats)}")
        
    except Exception as e:
        print(f"❌ MongoDB error: {e}")
        mongo_chats = []

    # Convert mongo_chats to a dictionary for easier lookup
    chat_dict = {chat['_id']: chat for chat in mongo_chats}

    # Get contacts from JSON files
    json_contacts = get_contacts_from_json_files()
    print(f"JSON contacts found: {len(json_contacts)}")

    # Merge contacts from JSON files with chat data from MongoDB
    all_chats = []
    for contact in json_contacts:
        wa_id = contact['wa_id']
        if wa_id in chat_dict:
            # Contact has messages in MongoDB, use that data
            chat = chat_dict[wa_id]
            all_chats.append({
                "wa_id": chat['_id'],
                "name": chat.get('name', 'Unknown'),
                "last_message": chat.get('last_message', ''),
                "last_timestamp": chat.get('last_timestamp', ''),
                "unread_count": chat.get('unread_count', 0)
            })
        else:
            # Contact from JSON but no messages in MongoDB, create a default entry
            all_chats.append({
                "wa_id": wa_id,
                "name": contact['name'],
                "last_message": '',
                "last_timestamp": '',
                "unread_count": 0
            })

    print(f"Total chats to return: {len(all_chats)}")
    return jsonify(all_chats)


@app.route('/chats/<wa_id>', methods=['GET'])
def get_messages(wa_id):
    try:
        messages = list(collection.find({"wa_id": wa_id}).sort("timestamp", 1))
        for m in messages:
            m["_id"] = str(m["_id"])  # Convert ObjectId to string for frontend
        if not messages:
            # Fallback to payloads if empty in DB
            messages = get_messages_from_payloads(wa_id)
        return Response(json_util.dumps(messages), mimetype='application/json')
    except Exception as e:
        print(f"DB error on get_messages: {e}")
        messages = get_messages_from_payloads(wa_id)
        return Response(json_util.dumps(messages), mimetype='application/json')


@app.route('/messages', methods=['POST'])
def send_message():
    data = request.json
    if not data.get("wa_id") or not data.get("text"):
        return jsonify({"error": "wa_id and text are required"}), 400

    new_message = {
        "id": "local_" + datetime.now().strftime("%Y%m%d%H%M%S"),
        "wa_id": data["wa_id"],
        "name": data.get("name", "You"),
        "timestamp": datetime.now().timestamp(),
        "text": {"body": data["text"]},
        "type": "text",
        "status": "sent"
    }

    try:
        result = collection.insert_one(new_message)
        try:
            # Ensure no ObjectId leaks into SSE payload
            new_message_copy = json.loads(json_util.dumps(new_message))
        except Exception:
            new_message_copy = new_message
    except Exception as e:
        print(f"DB insert failed: {e}")
        new_message_copy = new_message

    # Push new message event to queue for SSE (works even if DB down)
    try:
        event_json = json.dumps({"type": "new_message", "message": new_message_copy})
    except TypeError:
        # Fallback using bson util
        event_json = json_util.dumps({"type": "new_message", "message": new_message_copy})
    event_queue.put(event_json)
    # Also emit via websocket
    socketio.emit('new_message', new_message_copy, broadcast=True)

    return jsonify({"message": "Message stored successfully"}), 201

@app.route('/events')
def events():
    @stream_with_context
    def event_stream():
        while True:
            try:
                # Wait for new events, with a timeout
                event = event_queue.get(timeout=1) 
                yield f"data: {event}\\n\\n"
            except queue.Empty:
                # Send a keep-alive comment if no events
                yield ": ping\\n\\n"
            time.sleep(0.5) # Small delay to prevent busy-waiting

    return Response(event_stream(), mimetype="text/event-stream")


if __name__ == '__main__':
    # Disable reloader to avoid Windows socket errors and ensure stable dev server
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False)
