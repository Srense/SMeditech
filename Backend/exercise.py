import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify, redirect
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
from flask_socketio import SocketIO
import requests  # For AbstractAPI calls

# Load environment variables
load_dotenv()

app = Flask(__name__)

# CORS Restriction
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

# Serializer for tokens
serializer = URLSafeTimedSerializer(os.getenv('SECRET_KEY', 'default-secret'))

# JWT secret
JWT_SECRET = os.getenv('JWT_SECRET', 'your_jwt_secret_key')

# AbstractAPI key
ABSTRACT_API_KEY = os.getenv('ABSTRACT_API_KEY')

# Local fallback blacklist patterns
BLACKLISTED_PATTERNS = [
    "tempmail", "mailinator", "10minutemail", "yopmail", "guerrillamail",
    "trashmail", "fakeinbox", "discard.email", "sharklasers", "getnada"
]

# ================= Email Validation =================
def is_email_in_local_blacklist(email):
    return any(pattern in email.lower() for pattern in BLACKLISTED_PATTERNS)

def is_email_valid(email):
    try:
        url = f"https://emailvalidation.abstractapi.com/v1/?api_key={ABSTRACT_API_KEY}&email={email}"
        resp = requests.get(url, timeout=5)
        data = resp.json()
        if data.get("is_valid_format", {}).get("value") and \
           not data.get("is_disposable_email", {}).get("value") and \
           data.get("is_smtp_valid", {}).get("value"):
            return True
        return False
    except Exception as e:
        print(f"[WARNING] Email API failed ({e}), using local blacklist...")
        return not is_email_in_local_blacklist(email)

# ================= Helpers =================
def find_user(email):
    return users_col.find_one({"email": email})

def serialize_user(user):
    user["_id"] = str(user["_id"])
    user.pop("password", None)
    return user

def create_jwt(user_id):
    return jwt.encode(
        {"user_id": user_id, "exp": datetime.utcnow() + timedelta(minutes=15)},
        JWT_SECRET, algorithm="HS256"
    )

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

# ================= Email Verification =================
def send_verification_email(email):
    token = serializer.dumps(email, salt="email-verify")
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    # Link to backend verification endpoint
    verify_link = f"{FRONTEND_URL}/api/verify-email/{token}"
    try:
        msg = Message(
            subject="Verify Your Email - SMeditech",
            recipients=[email],
            body=(
                f"Welcome to SMeditech!\n\n"
                f"Please click below to verify your email:\n{verify_link}\n\n"
                f"This link will expire in 24 hours."
            )
        )
        mail.send(msg)
        print(f"[INFO] Sent verification email to {email}")
    except Exception as e:
        print("[ERROR] Could not send verification email:", e)

@app.route('/api/verify-email/<token>', methods=['GET'])
def verify_email(token):
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    try:
        email = serializer.loads(token, salt="email-verify", max_age=86400)  # valid 24 hrs
    except SignatureExpired:
        return redirect(f"{FRONTEND_URL}/verify-email-failure?reason=expired")
    except BadSignature:
        return redirect(f"{FRONTEND_URL}/verify-email-failure?reason=invalid")

    user = find_user(email)
    if not user:
        return redirect(f"{FRONTEND_URL}/verify-email-failure?reason=notfound")
    if user.get("is_verified"):
        return redirect(f"{FRONTEND_URL}/verify-email-success?already=true")

    users_col.update_one({"email": email}, {"$set": {"is_verified": True}})
    return redirect(f"{FRONTEND_URL}/verify-email-success?verified=true")

# ================= API Routes =================
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    username, email, password = data.get("username"), data.get("email"), data.get("password")

    if not username or not email or not password:
        return jsonify({"error": "Please provide username, email, and password"}), 400

    email = email.lower()
    if not is_email_valid(email):
        return jsonify({"error": "Please use a valid, non-disposable email address"}), 400
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
        "is_verified": False,
        "createdAt": datetime.utcnow()
    }
    users_col.insert_one(user)

    try:
        send_verification_email(email)
    except Exception as e:
        print("[ERROR] Email send failed:", e)

    return jsonify({"message": "Signup successful! Please check your email to verify your account."}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data or not all(k in data for k in ("email", "password")):
        return jsonify({"error": "Please provide email and password"}), 400
    email = data["email"].lower()
    user = find_user(email)
    if not user or not bcrypt.checkpw(data["password"].encode("utf-8"), user["password"]):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user.get("is_verified"):
        return jsonify({"error": "Please verify your email before logging in"}), 403
    token = create_jwt(str(user["_id"]))
    return jsonify({"token": token, "user": serialize_user(user)}), 200

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

@app.route('/')
def home():
    return "Welcome to SMeditech backend API. Please use /api endpoints."

# ================= Run Server =================
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
