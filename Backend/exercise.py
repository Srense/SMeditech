import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify, Response
from datetime import datetime, timedelta
from flask_cors import CORS
from flask_mail import Mail, Message
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import bcrypt
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
import jwt
from bson import ObjectId, Binary
from flask_socketio import SocketIO
import requests

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)

# CORS
CORS(app,
     origins=["https://smeditech.onrender.com", "http://localhost:3000"],
     supports_credentials=True)

socketio = SocketIO(app,
                    cors_allowed_origins=["https://smeditech.onrender.com", "http://localhost:3000"])

# MongoDB
client = MongoClient(os.getenv("MONGODB_URI"))
db = client["sohel"]
appointments_col = db["appointments"]
callbacks_col = db["callbacks"]
users_col = db["users"]

# Mail config
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')
mail = Mail(app)
NOTIFY_EMAIL = os.getenv('NOTIFY_EMAIL')

# Serializer secrets
serializer = URLSafeTimedSerializer(os.getenv('SECRET_KEY', 'default-secret'))
JWT_SECRET = os.getenv('JWT_SECRET', 'your_jwt_secret_key')
ABSTRACT_API_KEY = os.getenv('ABSTRACT_API_KEY')

# Temporary email blacklist patterns
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

# ================= Email Verification =================
def send_verification_email(email):
    token = serializer.dumps(email, salt="email-verify")
    verify_link = f"{os.getenv('BACKEND_URL', 'http://localhost:5000')}/api/verify-email/{token}"
    try:
        msg = Message(
            subject="Verify Your Email - SMeditech",
            recipients=[email],
            body=f"Welcome to SMeditech!\n\nPlease click below to verify your email:\n{verify_link}\n\nThis link will expire in 24 hours."
        )
        mail.send(msg)
        print(f"[INFO] Sent verification email to {email}")
    except Exception as e:
        print("[ERROR] Could not send verification email:", e)

@app.route('/api/verify-email/<token>', methods=['GET'])
def verify_email(token):
    try:
        email = serializer.loads(token, salt="email-verify", max_age=86400)
    except SignatureExpired:
        return jsonify({"error": "Verification link expired"}), 400
    except BadSignature:
        return jsonify({"error": "Invalid verification link"}), 400

    user = find_user(email)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("is_verified"):
        return jsonify({"message": "Email already verified"}), 200

    users_col.update_one({"email": email}, {"$set": {"is_verified": True}})
    return jsonify({"message": "Email verified successfully. You can now login."}), 200

# ================= Forgot Password =================
def send_password_reset_email(email):
    token = serializer.dumps(email, salt="password-reset")
    reset_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/reset-password/{token}"
    try:
        msg = Message(
            subject="Reset Your Password - SMeditech",
            recipients=[email]
        )
        msg.body = f"Click the link to reset your password: {reset_link}\nThis link expires in 1 hour."
        msg.html = f"""
        <p>We received a request to reset your password.</p>
        <p>Click the button below to set a new one:</p>
        <p><a href="{reset_link}" style="display:inline-block;padding:10px 20px;background-color:#dc3545;color:white;text-decoration:none;border-radius:5px;">Reset Password</a></p>
        <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
        """
        mail.send(msg)
    except Exception as e:
        print("[ERROR] Could not send password reset email:", e)

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get("email", "").lower()
    user = find_user(email)
    if user:
        send_password_reset_email(email)
    return jsonify({"message": "If this email is registered, a password reset link will be sent."}), 200

@app.route('/api/reset-password/<token>', methods=['POST'])
def reset_password(token):
    data = request.json
    new_password = data.get("password")
    if not new_password:
        return jsonify({"error": "Password is required"}), 400
    try:
        email = serializer.loads(token, salt="password-reset", max_age=3600)
    except SignatureExpired:
        return jsonify({"error": "Password reset link expired"}), 400
    except BadSignature:
        return jsonify({"error": "Invalid password reset link"}), 400

    user = find_user(email)
    if not user:
        return jsonify({"error": "User not found"}), 404

    hashed_pw = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
    users_col.update_one({"email": email}, {"$set": {"password": hashed_pw}})
    return jsonify({"message": "Password has been reset successfully"}), 200

# ================= Signup/Login =================
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
        "profilePicture": None,
        "profilePictureType": None,  # store MIME type
        "password": hashed_pw,
        "is_verified": False,
        "createdAt": datetime.utcnow()
    }
    users_col.insert_one(user)

    send_verification_email(email)
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

# ================= Profile Update =================
@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = decoded["user_id"]
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    bio = request.form.get("bio", "")
    photo_file = request.files.get("photo")
    update_data = {"bio": bio}

    if photo_file:
        update_data["profilePicture"] = Binary(photo_file.read())
        update_data["profilePictureType"] = photo_file.mimetype

    users_col.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    updated_user = users_col.find_one({"_id": ObjectId(user_id)})
    return jsonify({"user": serialize_user(updated_user)}), 200

# Endpoint to serve photo
@app.route('/api/user-photo/<user_id>', methods=['GET'])
def get_user_photo(user_id):
    try:
        user = users_col.find_one({"_id": ObjectId(user_id)})
        if not user or not user.get("profilePicture"):
            return jsonify({"error": "Photo not found"}), 404
        return Response(user["profilePicture"], mimetype=user.get("profilePictureType", "image/jpeg"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ================= Appointment & Callback =================
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

@app.route('/')
def home():
    return "Welcome to SMeditech backend API. Please use /api endpoints."

# ================= Run Server =================
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
