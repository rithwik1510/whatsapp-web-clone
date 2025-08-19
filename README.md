# WhatsApp Web Clone

A real-time messaging application built with Flask, Socket.IO, and MongoDB that mimics WhatsApp Web's interface and functionality.

## 📖 About This Project

This WhatsApp Web clone is a full-stack messaging application that demonstrates modern web development techniques and real-time communication. We built this project to showcase how to create a responsive, real-time messaging platform that closely resembles the popular WhatsApp Web interface.

**What We Built:**
We developed a complete messaging system that includes a beautiful, responsive frontend interface and a robust backend that handles real-time message delivery, status tracking, and data persistence. The application features a two-panel layout similar to WhatsApp Web - a sidebar showing chat conversations and a main chat area for messaging. Users can send messages, see real-time typing indicators, and track message delivery status (sent, delivered, read) just like the original WhatsApp.

**Technical Implementation:**
The backend is powered by Flask with Socket.IO for real-time WebSocket connections, enabling instant message delivery and live status updates. We implemented MongoDB for message storage with an intelligent fallback to in-memory storage when the database is unavailable. The frontend uses vanilla JavaScript with Socket.IO client for seamless real-time communication, while the UI is built with modern CSS and responsive design principles. The application also includes webhook support for integrating with external messaging services and comprehensive error handling for production readiness.

**Key Features We Implemented:**
Our implementation includes all the essential features you'd expect from a modern messaging app: real-time message delivery, typing indicators, message status tracking, search functionality, and a responsive design that works across devices. We also added sample data processing capabilities, multiple deployment configurations (Heroku, Render, Docker), and comprehensive testing utilities. The project demonstrates best practices in web development, including proper separation of concerns, error handling, and scalable architecture patterns.

## 🚀 Features

- **Real-time Messaging**: Instant message delivery using WebSocket connections
- **Message Status Tracking**: Real-time updates for sent, delivered, and read status
- **Modern UI**: WhatsApp Web-inspired interface with responsive design
- **Search Functionality**: Search through conversations and messages
- **Typing Indicators**: Real-time typing status notifications
- **Message Persistence**: Store messages in MongoDB or in-memory fallback
- **WebSocket & SSE Support**: Multiple real-time communication methods
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

### Backend
- **Flask**: Python web framework
- **Flask-SocketIO**: WebSocket support for real-time communication
- **PyMongo**: MongoDB driver for data persistence
- **Eventlet**: Asynchronous networking library
- **Gunicorn**: WSGI HTTP Server for production

### Frontend
- **HTML5/CSS3**: Modern web standards
- **JavaScript (ES6+)**: Client-side functionality
- **Socket.IO Client**: Real-time communication
- **Inter Font**: Modern typography

### Database
- **MongoDB**: NoSQL database for message storage
- **In-memory Fallback**: Automatic fallback when MongoDB is unavailable

## 📋 Prerequisites

- Python 3.7+
- MongoDB (optional - app works with in-memory storage)
- Modern web browser with WebSocket support

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd WEB
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Database (Optional)
Edit `config.py` to set up your MongoDB connection:

```python
# Option 1: MongoDB Atlas (Cloud)
MONGO_URI = "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/whatsapp?retryWrites=true&w=majority"

# Option 2: Local MongoDB
MONGO_URI = "mongodb://localhost:27017/whatsapp"

# Option 3: Environment variable
MONGO_URI = os.environ.get("MONGO_URI", "")
```

**Note**: If no MongoDB is configured, the app will automatically use in-memory storage.

### 4. Run the Application

#### Development Mode
```bash
python app.py
```

#### Production Mode
```bash
gunicorn -c gunicorn.conf.py app:app
```

### 5. Access the Application
Open your browser and navigate to:
```
http://localhost:5000/Frontened/
```

## 📁 Project Structure

```
WEB/
├── app.py                 # Main Flask application
├── config.py             # Configuration settings
├── requirements.txt      # Python dependencies
├── gunicorn.conf.py     # Gunicorn configuration
├── Frontened/           # Frontend assets
│   ├── index.html       # Main HTML file
│   ├── style.css        # Stylesheets
│   ├── script.js        # Client-side JavaScript
│   └── assets/          # Images and icons
├── payloads/            # Sample message payloads
├── setup_database.py    # Database setup script
└── README.md           # This file
```

## 🔧 Configuration

### Environment Variables
- `MONGO_URI`: MongoDB connection string
- `PORT`: Application port (default: 5000)

### MongoDB Setup (Optional)
If using MongoDB, create the database and collection:
```bash
python setup_database.py
```

## 🎯 Usage

### Starting a Chat
1. Open the application in your browser
2. Click on a contact or start a new chat
3. Type your message and press Enter or click Send

### Real-time Features
- **Message Status**: Messages show sent → delivered → read status
- **Typing Indicators**: See when someone is typing
- **Instant Delivery**: Messages appear instantly for all connected users

### Testing with Sample Data
The application includes sample payloads in the `payloads/` directory for testing:
```bash
python process_payloads.py
```

## 🔌 API Endpoints

### WebSocket Events
- `connect`: Client connection
- `disconnect`: Client disconnection
- `typing_start`: User starts typing
- `typing_stop`: User stops typing
- `status_update`: Message status updates

### HTTP Endpoints
- `GET /Frontened/`: Main application interface
- `POST /webhook`: Webhook for incoming messages
- `GET /messages/<wa_id>`: Get messages for a user
- `GET /status/<message_id>`: Get message status

## 🚀 Deployment

### Heroku
1. Create a `Procfile` (already included)
2. Set environment variables in Heroku dashboard
3. Deploy using Heroku CLI or GitHub integration

### Render
1. Use the included `render.yaml` for automatic deployment
2. Set environment variables in Render dashboard

### Docker (Custom)
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app:app"]
```

## 🧪 Testing

### Manual Testing
```bash
python manual_status_test.py
```

### Connection Testing
```bash
python test_connection.py
```

### Status Check
```bash
python check_status.py
```

## 🔒 Security Considerations

- CORS is enabled for development (configure appropriately for production)
- WebSocket connections are open (add authentication for production)
- MongoDB connection should use proper authentication
- Environment variables for sensitive data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is for educational purposes. Please respect WhatsApp's terms of service.

## 🆘 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Check if MongoDB is running
- Verify connection string in `config.py`
- App will fallback to in-memory storage

**WebSocket Connection Issues**
- Ensure browser supports WebSockets
- Check firewall settings
- Verify Socket.IO client version

**Messages Not Persisting**
- Check MongoDB connection
- Verify database permissions
- Check application logs

### Logs
Application logs are printed to console. Check for:
- ✅ Success messages
- ❌ Error messages
- Connection status updates

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Create an issue in the repository

---

**Note**: This is a demonstration project. For production use, implement proper authentication, security measures, and follow WhatsApp's API guidelines.
