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
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
import jwt
from bson import ObjectId
from flask_socketio import SocketIO, emit
import re
import requests

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

# Serializer for reset + verification
serializer = URLSafeTimedSerializer(os.getenv('MAIL_PASSWORD') or "secret-key")

# JWT Secret
JWT_SECRET = os.getenv('JWT_SECRET', 'your_jwt_secret_key')

# 📌 Email validation API key
MAILBOXLAYER_API_KEY = os.getenv('MAILBOXLAYER_API_KEY')

# ---------------- Helper functions ----------------
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
        user = users_col.find_one({"_id": ObjectId(payload.get('user_id'))})
        if not user:
            return None, "User not found"
        return user, None
    except Exception as e:
        print(f"Token decoding error: {e}")
        return None, "Invalid or expired token"

# 📌 Validate email with MailboxLayer
def validate_email_via_api(email):
    if not MAILBOXLAYER_API_KEY:
        print("⚠ No MailboxLayer API key — skipping real validation")
        return True
    try:
        res = requests.get(
            f"http://apilayer.net/api/check?access_key={MAILBOXLAYER_API_KEY}&email={email}&smtp=1&format=1",
            timeout=10
        ).json()
        return res.get('format_valid') and res.get('smtp_check') and not res.get('disposable')
    except Exception as e:
        print("Email validation error:", e)
        return False

# 📌 Send verification email
def send_verification_email(email):
    token = serializer.dumps(email, salt="email-verify")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    verification_link = f"{FRONTEND_URL}/verify-email/{token}"
    try:
        mail.send(Message(
            subject="Verify Your SMeditech Account",
            recipients=[email],
            body=f"Welcome to SMeditech!\n\nClick the link to verify your email: {verification_link}\nThis link expires in 24 hours."
        ))
        print(f"✅ Sent verification email to {email}")
    except Exception as e:
        print("❌ Failed to send verification email:", e)

# ---------------- API Routes ----------------
@app.route('/api/appointment', methods=['POST'])
def book_appointment():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
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

@app.route('/api/callback', methods=['POST'])
def request_callback():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
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

# 📌 Updated Signup with email validation + verification sending
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    username, email, password = data.get("username"), data.get("email"), data.get("password")
    if not username or not email or not password:
        return jsonify({"error": "Please provide username, email, and password"}), 400
    email = email.lower()

    if not validate_email_via_api(email):
        return jsonify({"error": "Invalid, disposable, or non-existent email address"}), 400
    if users_col.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400

    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    users_col.insert_one({
        "name": username,
        "username": username,
        "email": email,
        "password": hashed_pw,
        "bio": "",
        "profilePicture": "",
        "createdAt": datetime.utcnow(),
        "is_verified": False
    })
    send_verification_email(email)
    return jsonify({"message": "Account created. Please verify your email before logging in."}), 201

# 📌 Email verification endpoint
@app.route('/api/verify-email/<token>', methods=['GET'])
def verify_email(token):
    try:
        email = serializer.loads(token, salt="email-verify", max_age=86400)
    except SignatureExpired:
        return jsonify({"error": "Verification link expired"}), 400
    except BadSignature:
        return jsonify({"error": "Invalid verification token"}), 400
    users_col.update_one({"email": email}, {"$set": {"is_verified": True}})
    return jsonify({"message": "Email verified successfully! You can now log in."}), 200

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data or not all(k in data for k in ("email", "password")):
        return jsonify({"error": "Please provide email and password"}), 400
    email = data["email"].lower()
    user = find_user(email)
    if not user or not bcrypt.checkpw(data["password"].encode("utf-8"), user["password"]):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user.get("is_verified", False):
        return jsonify({"error": "Please verify your email before logging in."}), 403
    token = create_jwt(str(user["_id"]))
    return jsonify({"token": token, "user": serialize_user(user)}), 200

# --- Forgot & Reset password remain unchanged ---
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    email = request.json.get("email", "").lower()
    if not email:
        return jsonify({"error": "Email required"}), 400
    user = find_user(email)
    if not user:
        return jsonify({"message": "If an account exists, a reset link has been sent."}), 200
    token = serializer.dumps(email, salt="reset-password")
    reset_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password/{token}"
    mail.send(Message(
        subject="Password Reset Request",
        recipients=[email],
        body=f"Reset your password: {reset_link}\nThis link is valid for 1 hour."
    ))
    return jsonify({"message": "If an account exists, a reset link has been sent."}), 200

@app.route('/api/reset-password/<token>', methods=['POST'])
def reset_password(token):
    pw = request.json.get("password")
    if not pw:
        return jsonify({"error": "Password required"}), 400
    try:
        email = serializer.loads(token, salt="reset-password", max_age=3600)
    except Exception:
        return jsonify({"error": "Invalid or expired token"}), 400
    hashed_pw = bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt())
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
    users_col.update_one({"_id": user["_id"]}, {"$set": request.json})
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

# --- Chatbot & socket remain unchanged ---
def get_ai_response_from_kb(user_query):
    user_query_lower = user_query.lower()
    sensitive_keywords = ["password", "api key", "mongo uri", "secret", "private", "confidential"]
    if any(word in user_query_lower for word in sensitive_keywords):
        return "I'm sorry, but I can't share sensitive or private information."
    if re.search(r'\b(hello|hi|hey|greetings)\b', user_query_lower):
        return "Hello! I'm your AI Physiotherapy Assistant. How can I help you?"
    return "I can assist with physiotherapy services, appointments, and exercises."

@socketio.on('send_message', namespace='/chat')
def handle_send_message(data):
    emit('receive_message', {
        'text': data.get("text"),
        'username': data.get("username"),
        'timestamp': datetime.now().strftime("%I:%M %p")
    }, broadcast=True)
    emit('receive_message', {
        'text': get_ai_response_from_kb(data.get("text", "")),
        'username': 'AI Assistant',
        'timestamp': datetime.now().strftime("%I:%M %p")
    }, broadcast=True)

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
