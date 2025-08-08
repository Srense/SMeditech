import eventlet
eventlet.monkey_patch()

from flask import Flask, Response, request, jsonify
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

# --- Load environment variables ---
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- MongoDB setup ---
client = MongoClient(os.getenv("MONGODB_URI"))
db = client["sohel"]
appointments_col = db["appointments"]
callbacks_col = db["callbacks"]
users_col = db["users"]

# --- Flask-Mail setup ---
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')
mail = Mail(app)
NOTIFY_EMAIL = os.getenv('NOTIFY_EMAIL')

# --- Password reset serializer ---
serializer = URLSafeTimedSerializer(os.getenv('MAIL_PASSWORD') or "secret-key")

# --- JWT Secret ---
JWT_SECRET = os.getenv('JWT_SECRET', 'your_jwt_secret_key')

# --- Helper functions ---

def find_user(email):
    return users_col.find_one({"email": email})

def serialize_user(user):
    user["_id"] = str(user["_id"])
    if "password" in user:
        user.pop("password")
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

# --- API Routes ---

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
    user.pop("password")
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
        recipients=[NOTIFY_EMAIL],  # For actual use: [email]
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

# Knowledge base and AI/chat socket handlers unchanged and omitted here for brevity

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=True)
