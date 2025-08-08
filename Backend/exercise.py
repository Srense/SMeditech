import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify
from datetime import datetime, timedelta
from flask_cors import CORS
from flask_mail import Mail, Message
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import bcrypt
from itsdangerous import URLSafeTimedSerializer
import jwt
from bson import ObjectId
from flask_socketio import SocketIO, emit
import time
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Restrict CORS to frontend origins
CORS(app,
     origins=["https://smeditech.onrender.com", "http://localhost:3000"],
     supports_credentials=True)

socketio = SocketIO(app,
                   cors_allowed_origins=["https://smeditech.onrender.com", "http://localhost:3000"])

# MongoDB setup
client = MongoClient(os.getenv("MONGODB_URI"))
db = client["sohel"]
appointments_col = db["appointments"]
callbacks_col = db["callbacks"]
users_col = db["users"]

# Flask-Mail setup
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')
mail = Mail(app)
NOTIFY_EMAIL = os.getenv('NOTIFY_EMAIL')

# Password reset serializer
serializer = URLSafeTimedSerializer(os.getenv('MAIL_PASSWORD') or "secret-key")

# JWT Secret
JWT_SECRET = os.getenv('JWT_SECRET', 'your_jwt_secret_key')

# Helper functions
def find_user(email):
    return users_col.find_one({"email": email})

def serialize_user(user):
    user["_id"] = str(user["_id"])
    user.pop("password", None)
    return user

def create_jwt(user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(minutes=15)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def get_current_user():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, "Missing or invalid token"
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get('user_id')
        user = users_col.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None, "User not found"
        return user, None
    except Exception as e:
        print(f"Token decoding error: {e}")
        return None, "Invalid or expired token"

# API Routes
@app.route('/api/appointment', methods=['POST'])
def book_appointment():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    try:
        appointments_col.insert_one({
            "name": data.get("name"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "age": data.get("age"),
            "gender": data.get("gender"),
            "condition": data.get("condition"),
            "createdAt": datetime.utcnow()
        })
        return jsonify({"message": "Appointment saved"}), 201
    except Exception as e:
        print("Error saving appointment:", e)
        return jsonify({"error": "Failed to save appointment"}), 500

@app.route('/api/callback', methods=['POST'])
def request_callback():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    try:
        callbacks_col.insert_one({
            "name": data.get("name"),
            "phone": data.get("phone"),
            "message": data.get("message"),
            "createdAt": datetime.utcnow()
        })
        msg = Message(
            subject="New Callback Request",
            recipients=[NOTIFY_EMAIL],
            body=f"Name: {data.get('name')}\nPhone: {data.get('phone')}\nMessage: {data.get('message', '')}"
        )
        mail.send(msg)
        return jsonify({"message": "Callback request saved and email sent"}), 201
    except Exception as e:
        print("Error saving callback or sending email:", e)
        return jsonify({"error": "Failed to save callback or send email"}), 500

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    if not username or not email or not password:
        return jsonify({"error": "Please provide username, email, and password"}), 400
    email = email.lower()
    if users_col.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400
    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    user = {
        "name": username,
        "username": username,
        "email": email,
        "bio": "",
        "profilePicture": "",
        "password": hashed_pw,
        "createdAt": datetime.utcnow()
    }
    result = users_col.insert_one(user)
    user["_id"] = str(result.inserted_id)
    user.pop("password", None)
    return jsonify({"user": user}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data or not all(k in data for k in ("email", "password")):
        return jsonify({"error": "Please provide email and password"}), 400
    email = data["email"].lower()
    user = find_user(email)
    if not user or not bcrypt.checkpw(data["password"].encode("utf-8"), user["password"]):
        return jsonify({"error": "Invalid email or password"}), 401
    token = create_jwt(str(user["_id"]))
    return jsonify({"token": token, "user": serialize_user(user)}), 200

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get("email")
    if not email:
        return jsonify({"error": "Email required"}), 400
    email = email.lower()
    user = find_user(email)
    if not user:
        return jsonify({"message": "If an account exists, a reset link has been sent."}), 200
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    token = serializer.dumps(email, salt="reset-password")
    reset_link = f"{FRONTEND_URL}/reset-password/{token}"
    msg = Message(
        subject="Password Reset Request",
        recipients=[email],
        body=f"Click the link to reset your password: {reset_link}\nThis link is valid for 1 hour."
    )
    try:
        mail.send(msg)
    except Exception as e:
        print("Error sending reset email:", e)
    return jsonify({"message": "If an account exists, a reset link has been sent."}), 200

@app.route('/api/reset-password/<token>', methods=['POST'])
def reset_password(token):
    data = request.json
    new_password = data.get("password")
    if not new_password:
        return jsonify({"error": "Password required"}), 400
    try:
        email = serializer.loads(token, salt="reset-password", max_age=3600)
    except Exception:
        return jsonify({"error": "Invalid or expired token"}), 400
    user = find_user(email)
    if not user:
        return jsonify({"error": "User not found"}), 404
    hashed_pw = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
    users_col.update_one({"email": email}, {"$set": {"password": hashed_pw}})
    return jsonify({"message": "Password reset successful"}), 200

@app.route('/api/profile', methods=['GET'])
def get_profile():
    user, err = get_current_user()
    if err:
        return jsonify({"error": err}), 401
    return jsonify({"user": serialize_user(user)}), 200

@app.route('/api/profile', methods=['PATCH'])
def update_profile():
    user, err = get_current_user()
    if err:
        return jsonify({"error": err}), 401
    data = request.json
    update_fields = {}
    if "bio" in data:
        update_fields["bio"] = data["bio"]
    if "profilePicture" in data:
        update_fields["profilePicture"] = data["profilePicture"]
    if "username" in data:
        update_fields["username"] = data["username"]
        update_fields["name"] = data["username"]
    if update_fields:
        users_col.update_one({"_id": user["_id"]}, {"$set": update_fields})
    user = users_col.find_one({"_id": user["_id"]})
    return jsonify({"user": serialize_user(user)}), 200

@app.route('/api/db_status')
def db_status():
    try:
        client.admin.command('ping')
        return jsonify({"status": "connected"}), 200
    except Exception as e:
        return jsonify({"status": "disconnected", "error": str(e)}), 500

@app.route('/api/health')
def health():
    return jsonify({"status": "ok"}), 200

@app.route('/')
def home():
    return "Welcome to SMeditech backend API. Please use /api endpoints."

# Comprehensive knowledge base for SMeditech chatbot AI assistant
KNOWLEDGE_BASE = [
    {"id": "faq1", "keywords": ["what", "sm meditech", "about", "website", "name"], "content": "SMeditech is a modern remote physiotherapy platform designed to help users book appointments, communicate with therapists, and follow personalized exercise rehabilitation programs using AI-powered assistance and live exercise tracking."},
    {"id": "faq2", "keywords": ["how", "work", "function", "use", "website"], "content": "The website allows you to create an account to manage your profile and appointments, perform physiotherapy exercises guided by AI pose detection using your webcam, chat with a virtual assistant for support, and download exercise reports to monitor your progress."},
    {"id": "faq3", "keywords": ["services", "offer", "physiotherapy", "treatment", "programs"], "content": "SMeditech offers physiotherapy services including injury rehabilitation, pain management, prevention programs, and personalized exercise plans — all accessible remotely via online booking and tele-rehabilitation."},
    {"id": "faq4", "keywords": ["how", "book", "appointment", "callback"], "content": "You can book an appointment easily by filling out the online booking form or by requesting a callback through the contact form on the website."},
    {"id": "faq5", "keywords": ["exercise", "tracking", "how", "work", "webcam", "mediaPipe"], "content": "Exercise tracking is performed in real-time using your webcam and MediaPipe’s pose estimation technology within the browser. The system counts your repetitions and analyzes your movements to provide feedback and ensure correct exercise form."},
    {"id": "faq6", "keywords": ["exercises", "supported", "track", "types"], "content": "Current supported exercises include squats, push-ups, arm raises, wrist rotations, finger twirling, and more, with plans to expand."},
    {"id": "faq7", "keywords": ["special", "equipment", "need"], "content": "No special equipment is required. A standard webcam or device camera is sufficient for exercise tracking."},
    {"id": "faq8", "keywords": ["account", "create", "sign up"], "content": "Create an account by signing up with a username, email, and password to access personalized features."},
    {"id": "faq9", "keywords": ["forgot", "password", "reset"], "content": "If you forget your password, use the Forgot Password feature to receive a secure reset link by email."},
    {"id": "faq10", "keywords": ["privacy", "security", "data", "safe"], "content": "Your data is kept secure using industry-standard encryption and authentication practices. Passwords and sensitive data are never shared or exposed."},
    {"id": "faq11", "keywords": ["password", "api", "key", "secret"], "content": "I'm sorry, but I can't share sensitive or private information. Please contact the site administrator for authorized assistance."},
    {"id": "faq12", "keywords": ["technologies", "used", "tech", "stack"], "content": "The frontend is built with React and MediaPipe JS for AI pose detection. The backend uses Python Flask with MongoDB for data storage, JWT for authentication, and Flask-SocketIO for real-time chat features."},
    {"id": "faq13", "keywords": ["webcam", "backend", "camera"], "content": "For privacy and platform restrictions, webcam access runs only on your device within your browser. The backend processes and stores data but does not access your camera."},
    {"id": "faq14", "keywords": ["start", "exercises", "how"], "content": "After logging in, select an exercise, and allow webcam access for AI pose detection to guide and count your repetitions in real time."},
    {"id": "faq15", "keywords": ["help", "support", "chat"], "content": "An AI chat assistant is available on the site to answer common questions about services, exercises, appointments, and more."},
    {"id": "faq16", "keywords": ["reports", "download", "exercise"], "content": "You can download your exercise progress reports from the specific exercise pages after sessions."},
    {"id": "faq17", "keywords": ["troubleshoot", "chat", "video", "connection"], "content": "Ensure stable internet, camera permissions enabled, and that frontend/backend URLs and sockets are correctly configured for smooth operation."},
    {"id": "faq18", "keywords": ["contact", "support", "clinic"], "content": "You can contact the clinic via the contact form or by booking an appointment for additional support."},
    {"id": "unrelated", "keywords": ["weather", "capital", "random"], "content": "I am an AI assistant focused on physiotherapy services and our clinic."}
]

def get_ai_response_from_kb(user_query):
    user_query_lower = user_query.lower()

    # Deny sensitive requests immediately
    sensitive_keywords = ["password", "api key", "mongo uri", "secret", "private", "confidential"]
    if any(word in user_query_lower for word in sensitive_keywords):
        return "I'm sorry, but I can't share sensitive or private information. Please contact the site admin for assistance."

    # Greetings and polite phrases handling
    if re.search(r'\b(hello|hi|hey|greetings)\b', user_query_lower):
        return "Hello! I'm your AI Physiotherapy Assistant. How can I help you today with our services or clinic information?"
    if re.search(r'\b(thank you|thanks|appreciate)\b', user_query_lower):
        return "You're most welcome! Is there anything else I can assist you with regarding your physiotherapy needs?"
    if re.search(r'\b(nothing else|no more|bye|goodbye)\b', user_query_lower):
        return "Alright, feel free to reach out if you have more questions later. Have a great day!"

    # Search knowledge base by keyword intersection
    best_match_doc = None
    max_matches = 0
    query_words = set(re.findall(r'\b\w+\b', user_query_lower))
    for doc in KNOWLEDGE_BASE:
        doc_keywords = set(doc.get("keywords", []))
        matches = len(query_words.intersection(doc_keywords))
        if matches > max_matches:
            max_matches = matches
            best_match_doc = doc

    if best_match_doc and max_matches > 0:
        return best_match_doc["content"]

    # Fallback default responses
    if re.search(r'\b(physiotherapy|clinic|services|appointment)\b', user_query_lower):
        return "I can help with questions about our physiotherapy services, booking appointments, clinic location, or contact details. Could you please specify what you're looking for?"
    return ("I apologize, but I couldn't find a direct answer to that in my knowledge base. "
            "My purpose is to assist with questions related to physiotherapy services and our clinic. "
            "Could you please ask something else or rephrase your question?")

# Socket.IO chat message handling
@socketio.on('send_message', namespace='/chat')
def handle_send_message(data):
    user_message_text = data.get("text")
    username = data.get("username")
    if user_message_text and username:
        emit('receive_message', {
            'text': user_message_text,
            'username': username,
            'timestamp': datetime.now().strftime("%I:%M %p")
        }, broadcast=True, namespace='/chat')

        emit('receive_message', {
            'text': 'Typing...',
            'username': 'AI Assistant',
            'timestamp': datetime.now().strftime("%I:%M %p"),
            'isTyping': True
        }, room=request.sid, namespace='/chat')

        ai_response_text = get_ai_response_from_kb(user_message_text)

        emit('clear_typing_indicator', {'username': 'AI Assistant'}, room=request.sid, namespace='/chat')
        emit('receive_message', {
            'text': ai_response_text,
            'username': 'AI Assistant',
            'timestamp': datetime.now().strftime("%I:%M %p")
        }, broadcast=True, namespace='/chat')
    else:
        print("Received malformed message:", data)

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
