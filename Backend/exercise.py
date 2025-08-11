import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify
from datetime import datetime, timedelta
from flask_cors import CORS
from flask_mail import Mail, Message
from pymongo import MongoClient
from dotenv import load_dotenv
import os, uuid
import bcrypt
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
import jwt
from bson import ObjectId
from flask_socketio import SocketIO
import requests
from werkzeug.utils import secure_filename

# Load env variables
load_dotenv()

app = Flask(__name__, static_folder="static")

# CORS
CORS(app,
     origins=["https://smeditech.onrender.com", "http://localhost:3000"],
     supports_credentials=True)

socketio = SocketIO(app,
                    cors_allowed_origins=["https://smeditech.onrender.com", "http://localhost:3000"])

# MongoDB
client = MongoClient(os.getenv("MONGODB_URI"))
db = client["sohel"]
users_col = db["users"]
appointments_col = db["appointments"]
callbacks_col = db["callbacks"]

# Mail config
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')
mail = Mail(app)
NOTIFY_EMAIL = os.getenv('NOTIFY_EMAIL')

# Serializer & JWT
serializer = URLSafeTimedSerializer(os.getenv('SECRET_KEY', 'default-secret'))
JWT_SECRET = os.getenv('JWT_SECRET', 'secret')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')

# AbstractAPI
ABSTRACT_API_KEY = os.getenv('ABSTRACT_API_KEY')
BLACKLISTED_PATTERNS = [
    "tempmail", "mailinator", "10minutemail", "yopmail", "guerrillamail",
    "trashmail", "fakeinbox", "discard.email", "sharklasers", "getnada"
]

# Allowed file types
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ---------------- Email Validation ----------------
def is_email_in_local_blacklist(email):
    return any(p in email.lower() for p in BLACKLISTED_PATTERNS)

def is_email_valid(email):
    try:
        url = f"https://emailvalidation.abstractapi.com/v1/?api_key={ABSTRACT_API_KEY}&email={email}"
        r = requests.get(url, timeout=5).json()
        return r.get("is_valid_format", {}).get("value") \
           and not r.get("is_disposable_email", {}).get("value") \
           and r.get("is_smtp_valid", {}).get("value")
    except:
        return not is_email_in_local_blacklist(email)

# ---------------- Helpers ----------------
def find_user(email):
    return users_col.find_one({"email": email})

def serialize_user(user):
    user["_id"] = str(user["_id"])
    user.pop("password", None)
    return user

def create_jwt(user_id):
    return jwt.encode({"user_id": user_id, "exp": datetime.utcnow() + timedelta(days=7)},
                      JWT_SECRET, algorithm="HS256")

def get_current_user():
    auth = request.headers.get('Authorization')
    if not auth or not auth.startswith('Bearer '):
        return None, "Missing or invalid token"
    try:
        payload = jwt.decode(auth.split(" ")[1], JWT_SECRET, algorithms=["HS256"])
        u = users_col.find_one({"_id": ObjectId(payload["user_id"])})
        return (u, None) if u else (None, "User not found")
    except:
        return None, "Invalid or expired token"

# ---------------- Email Actions ----------------
def send_verification_email(email):
    token = serializer.dumps(email, salt="email-verify")
    link = f"{FRONTEND_URL}/verify-email/{token}"
    msg = Message("Verify Your Email - SMeditech", recipients=[email])
    msg.html = f'<p><a href="{link}">Activate Account</a></p>'
    mail.send(msg)

def send_password_reset_email(email):
    token = serializer.dumps(email, salt="password-reset")
    link = f"{FRONTEND_URL}/reset-password/{token}"
    msg = Message("Reset Your Password - SMeditech", recipients=[email])
    msg.html = f'<p><a href="{link}">Reset Password</a></p>'
    mail.send(msg)

# ---------------- Routes ----------------
@app.route('/api/verify-email/<token>')
def verify_email(token):
    try:
        email = serializer.loads(token, salt="email-verify", max_age=86400)
    except SignatureExpired:
        return jsonify({"error": "Verification link expired"}), 400
    except BadSignature:
        return jsonify({"error": "Invalid verification link"}), 400
    if not find_user(email):
        return jsonify({"error": "User not found"}), 404
    users_col.update_one({"email": email}, {"$set": {"is_verified": True}})
    return jsonify({"message": "Email verified."})

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    email = request.json.get("email", "").lower()
    if find_user(email):
        send_password_reset_email(email)
    return jsonify({"message": "If registered, a password reset link has been sent."})

@app.route('/api/reset-password/<token>', methods=['POST'])
def reset_password(token):
    new_password = request.json.get("password")
    try:
        email = serializer.loads(token, salt="password-reset", max_age=3600)
    except SignatureExpired:
        return jsonify({"error": "Link expired"}), 400
    except BadSignature:
        return jsonify({"error": "Invalid link"}), 400
    hashed_pw = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt())
    users_col.update_one({"email": email}, {"$set": {"password": hashed_pw}})
    return jsonify({"message": "Password updated."})

@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    user, err = get_current_user()
    if not user:
        return jsonify({"error": err}), 401

    bio = request.form.get("bio", user.get("bio", ""))
    photo = request.files.get("photo")
    update_data = {"bio": bio}

    if photo and allowed_file(photo.filename):
        os.makedirs("static/profile_pictures", exist_ok=True)
        unique_name = f"{uuid.uuid4().hex}_{secure_filename(photo.filename)}"
        path = os.path.join("static/profile_pictures", unique_name)
        photo.save(path)
        update_data["profilePicture"] = f"{BACKEND_URL}/static/profile_pictures/{unique_name}"

    users_col.update_one({"_id": user["_id"]}, {"$set": update_data})
    updated_user = users_col.find_one({"_id": user["_id"]})
    return jsonify({"message": "Profile updated", "user": serialize_user(updated_user)})

@app.route('/api/profile')
def get_profile():
    user, err = get_current_user()
    if not user:
        return jsonify({"error": err}), 401
    return jsonify({"user": serialize_user(user)})

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    email = data["email"].lower()
    if not is_email_valid(email):
        return jsonify({"error": "Invalid email"}), 400
    if find_user(email):
        return jsonify({"error": "Email already registered"}), 400
    hashed = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt())
    users_col.insert_one({
        "name": data["username"], "username": data["username"],
        "email": email, "bio": "", 
        "profilePicture": f"{BACKEND_URL}/static/images/default-avatar.png",
        "password": hashed, "is_verified": False, "createdAt": datetime.utcnow()
    })
    send_verification_email(email)
    return jsonify({"message": "Signup successful. Please verify your email."})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data["email"].lower()
    user = find_user(email)
    if not user or not bcrypt.checkpw(data["password"].encode(), user["password"]):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user.get("is_verified"):
        return jsonify({"error": "Please verify your email"}), 403
    token = create_jwt(str(user["_id"]))
    return jsonify({"token": token, "user": serialize_user(user)})

@app.route('/api/appointment', methods=['POST'])
def appointment():
    appointments_col.insert_one({**request.json, "createdAt": datetime.utcnow()})
    return jsonify({"message": "Appointment saved"}), 201

@app.route('/api/callback', methods=['POST'])
def callback():
    callbacks_col.insert_one({**request.json, "createdAt": datetime.utcnow()})
    msg = Message(subject="New Callback", recipients=[NOTIFY_EMAIL], body=str(request.json))
    mail.send(msg)
    return jsonify({"message": "Callback saved and email sent"}), 201

@app.route('/')
def home():
    return "SMeditech Backend API running."

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
