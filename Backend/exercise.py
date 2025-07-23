# Assuming you have a .env file with OPENAI_API_KEY or GOOGLE_API_KEY

from flask import Flask, Response, request, jsonify
from datetime import datetime, timedelta
from flask_cors import CORS
from flask_mail import Mail, Message
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import cv2
import mediapipe as mp
import numpy as np
import bcrypt
from itsdangerous import URLSafeTimedSerializer
import jwt
from bson import ObjectId
from flask_socketio import SocketIO, emit
import time # For simulating AI processing time
import re # For more flexible keyword matching

# --- Load environment variables from .env ---
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- MongoDB Atlas setup ---
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

# --- Initialize MediaPipe ---
mp_pose = mp.solutions.pose
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

pose = mp_pose.Pose()
hands = mp_hands.Hands()

def calculate_angle(a, b, c):
    a = np.array([a.x, a.y])
    b = np.array([b.x, b.y])
    c = np.array([c.x, c.y])
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0:
        angle = 360 - angle
    return angle

# --- Exercise Tracking Variables ---
reps = 0
points = 0
stage = None
exercise = "Squats"
fullscreen = False
level = 1
progress = 0
max_points = 50
achievements = []
history = []

data_tracking = {
    "Squats": {"times": [], "reps": [], "points": []},
    "Finger Twirling": {"times": [], "reps": [], "points": []},
    "Head Rotation": {"times": [], "reps": [], "points": []},
    "Fist Rotation": {"times": [], "reps": [], "points": []},
    "Shoulder Circles": {"times": [], "reps": [], "points": []},
    "Arm Raises": {"times": [], "reps": [], "points": []},
    "Wall Push-ups": {"times": [], "reps": [], "points": []},
    "Elbow Flexion": {"times": [], "reps": []},
    "Wrist Rotations": {"times": [], "reps": []},
    "Knee Extensions": {"times": [], "reps": []},
    "Heel Slides": {"times": [], "reps": []},
    "Ankle Pumps": {"times": [], "reps": []},
    "Glute Bridges": {"times": [], "reps": []},
    "Standing Marches": {"times": [], "reps": []}
}

time_start = datetime.now()
tracking_interval = 5

def make_prediction(history):
    if len(history) < 5:
        return "Not enough data to predict."
    trends = [history[i] - history[i - 1] for i in range(1, len(history))]
    avg_trend = sum(trends) / len(trends)
    if avg_trend > 0:
        return "You're improving! Keep going!"
    elif avg_trend < 0:
        return "Your performance is declining. Try to focus!"
    else:
        return "Your progress is stable. Keep it up!"

def generate_frames():
    global exercise, reps, points, stage, fullscreen, level, progress, max_points, achievements, history, data_tracking, time_start
    # Note: cv2.VideoCapture(0) tries to access the local webcam.
    # On a remote server like Render, this will not work as there's no webcam.
    # This video feed will only work if running locally.
    # For production, you might need to stream video from a client or use pre-recorded video.
    cap = cv2.VideoCapture(0)
    screen_width = 1280
    screen_height = 720

    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            # If running on Render, cap.read() will fail.
            # You might want to break or handle this more gracefully for a production server
            # that doesn't have a camera, or if you plan to receive video streams.
            print("Warning: Could not read frame from camera. Is a webcam available or is this running remotely?")
            # To prevent an infinite loop of errors in a headless environment,
            # you might want to break or sleep here. For now, breaking.
            break

        frame = cv2.flip(frame, 1)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results_pose = pose.process(frame_rgb)
        results_hands = hands.process(frame_rgb)

        cv2.putText(frame, f"Exercise: {exercise}", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

        # Squat Tracking
        if exercise == "Squats" and results_pose.pose_landmarks:
            mp_drawing.draw_landmarks(frame, results_pose.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            landmarks = results_pose.pose_landmarks.landmark
            left_hip = mp_pose.PoseLandmark.LEFT_HIP
            left_knee = mp_pose.PoseLandmark.LEFT_KNEE
            left_ankle = mp_pose.PoseLandmark.LEFT_ANKLE
            knee_angle = calculate_angle(landmarks[left_hip], landmarks[left_knee], landmarks[left_ankle])
            if knee_angle > 160:
                stage = "up"
            elif knee_angle < 90 and stage == "up":
                stage = "down"
                reps += 1
                points += 10

        # Finger Twirling Tracking
        elif exercise == "Finger Twirling" and results_hands.multi_hand_landmarks:
            for hand_landmarks in results_hands.multi_hand_landmarks:
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                thumb_tip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_TIP]
                index_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
                distance = np.linalg.norm(np.array([thumb_tip.x, thumb_tip.y]) - np.array([index_tip.x, index_tip.y]))
                if distance < 0.03:
                    stage = "closed"
                elif distance > 0.06 and stage == "closed":
                    stage = "open"
                    reps += 1
                    points += 5

        # Head Rotation Tracking
        elif exercise == "Head Rotation" and results_pose.pose_landmarks:
            mp_drawing.draw_landmarks(frame, results_pose.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            landmarks = results_pose.pose_landmarks.landmark
            left_ear = mp_pose.PoseLandmark.LEFT_EAR
            nose = mp_pose.PoseLandmark.NOSE
            right_ear = mp_pose.PoseLandmark.RIGHT_EAR
            angle = calculate_angle(landmarks[left_ear], landmarks[nose], landmarks[right_ear])
            if angle > 140:
                stage = "rotated"
            elif angle < 100 and stage == "rotated":
                stage = "neutral"
                reps += 1
                points += 7

        # Fist Rotation Tracking
        elif exercise == "Fist Rotation" and results_hands.multi_hand_landmarks:
            for hand_landmarks in results_hands.multi_hand_landmarks:
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                wrist = hand_landmarks.landmark[mp_hands.HandLandmark.WRIST]
                pinky_tip = hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_TIP]
                distance = abs(wrist.y - pinky_tip.y)
                if distance > 0.1:
                    stage = "down"
                elif distance < 0.05 and stage == "down":
                    stage = "up"
                    reps += 1
                    points += 8

        progress = (points % max_points) / max_points * 100
        if points // max_points + 1 > level:
            level += 1
            achievements.append(f"Reached Level {level}")

        elapsed_time = datetime.now() - time_start
        if elapsed_time.total_seconds() >= tracking_interval:
            current_time = datetime.now()
            data_tracking[exercise]["times"].append(current_time)
            data_tracking[exercise]["reps"].append(reps)
            data_tracking[exercise]["points"].append(points)
            time_start = current_time
            history.append(points)
        prediction = make_prediction(history)

        cv2.putText(frame, f"Reps: {reps}", (10, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(frame, f"Points: {points}", (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
        cv2.putText(frame, f"Level: {level}", (10, 160), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)
        cv2.rectangle(frame, (10, 200), (310, 230), (200, 200, 200), -1)
        cv2.rectangle(frame, (10, 200), (10 + int(300 * progress / 100), 230), (0, 255, 0), -1)
        cv2.putText(frame, f"Progress: {int(progress)}%", (10, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        if achievements:
            cv2.putText(frame, f"Achievements: {', '.join(achievements[-3:])}", (10, 290), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

        frame = cv2.resize(frame, (screen_width, screen_height))
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()

@app.route('/video_feed')
def video_feed():
    ex = request.args.get('exercise')
    global exercise, reps, points, stage
    if ex:
        exercise = ex
        reps, points = 0, 0
        stage = None
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# --- Appointment Booking Endpoint ---
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

# --- Callback Request Endpoint ---
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

# --- User Authentication Endpoints ---

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
        "exp": datetime.utcnow() + timedelta(minutes=15) # Token valid for 15 minutes
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

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
    user.pop("password") # Don't send password back
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
    token = serializer.dumps(email, salt="reset-password")
    reset_link = f"http://localhost:3000/reset-password/{token}" # Make sure this matches your frontend route
    msg = Message(
        subject="Password Reset Request",
        recipients=[NOTIFY_EMAIL], # Changed to NOTIFY_EMAIL for testing, should be [email] in production
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
        email = serializer.loads(token, salt="reset-password", max_age=3600) # Token valid for 1 hour
    except Exception:
        return jsonify({"error": "Invalid or expired token"}), 400
    user = find_user(email)
    if not user:
        return jsonify({"error": "User not found"}), 404 # Should not happen if token is valid
    hashed_pw = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
    users_col.update_one({"email": email}, {"$set": {"password": hashed_pw}})
    return jsonify({"message": "Password reset successful"}), 200

# --- PROFILE ENDPOINTS (UPDATED) ---
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
        print(f"Token decoding error: {e}") # Log error for debugging
        return None, "Invalid or expired token"

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
    if "username" in data: # Allow updating username
        update_fields["username"] = data["username"]
        update_fields["name"] = data["username"] # Assuming name and username are the same
    if update_fields:
        users_col.update_one({"_id": user["_id"]}, {"$set": update_fields})
    user = users_col.find_one({"_id": user["_id"]}) # Fetch updated user
    return jsonify({"user": serialize_user(user)}), 200

# --- Status Endpoints ---
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

# --- Mock Knowledge Base for AI Assistant ---
# Expanded Knowledge Base for more comprehensive answers
KNOWLEDGE_BASE = [
    {"id": "faq1", "keywords": ["services", "physiotherapy", "offer"], "content": "Our website offers a comprehensive range of physiotherapy services designed to meet diverse needs. This includes: \n1. **Post-operative Rehabilitation:** Helping you regain strength and mobility after surgery. \n2. **Sports Injury Recovery:** Specialized programs for athletes to return to peak performance. \n3. **Chronic Pain Management:** Strategies and therapies to alleviate long-term pain. \n4. **Neurological Physiotherapy:** Support for conditions like stroke, Parkinson's, and MS. \n5. **Geriatric Physiotherapy:** Tailored exercises for seniors to maintain independence and mobility. \n6. **Pediatric Physiotherapy:** Early intervention and treatment for children with developmental or physical challenges. \n7. **Women's Health Physiotherapy:** Addressing conditions specific to women, including pre/post-natal care. \n\nYou can find more detailed descriptions of each service on our 'Services' page."},
    {"id": "faq2", "keywords": ["book", "appointment", "schedule", "consultation"], "content": "Booking an appointment is easy! You can: \n1. Visit our 'Book Appointment' page on the website and fill out the secure online form with your details and preferred time. \n2. Call us directly at **+91 9876543210** during our business hours (Monday-Friday, 9 AM to 5 PM IST). Our friendly staff will assist you. \n\nWe recommend booking in advance to secure your preferred slot."},
    {"id": "faq3", "keywords": ["location", "address", "clinic", "find us", "where are you"], "content": "Our clinic is conveniently located at **[Your Clinic Address Here]**. We are open from Monday to Friday, 9 AM to 5 PM IST. Please note that we are closed on weekends and all public holidays. We look forward to welcoming you!"},
    {"id": "contact1", "keywords": ["contact", "callback", "speak", "reach out", "email", "phone"], "content": "If you need to speak with a specialist or have a specific query, you can: \n1. Request a callback through the 'Contact Us' page on our website by filling a short form. \n2. Send us an email at **support@yourwebsite.com**. We aim to respond within 24 business hours. \n3. Call us directly at **+91 9876543210** during our operational hours."},
    {"id": "profile_update", "keywords": ["profile", "update", "change username", "bio", "picture"], "content": "You can easily update your profile information after logging in. Navigate to the 'Profile' section where you can modify your bio, upload a new profile picture, and even change your username. Remember to save your changes!"},
    {"id": "password_reset", "keywords": ["forgot password", "reset password", "login issue"], "content": "If you've forgotten your password, don't worry! \n1. Go to the login page. \n2. Click on the 'Forgot Password' link. \n3. Enter the email address associated with your account. \n4. We will send you a secure password reset link to that email address. Please check your spam folder if you don't see it in your inbox within a few minutes."},
    {"id": "about_us", "keywords": ["about us", "mission", "vision", "team"], "content": "We are dedicated to providing personalized and effective physiotherapy care. Our mission is to empower individuals to achieve optimal physical health and well-being through expert guidance and compassionate support. Our team consists of highly qualified and experienced physiotherapists committed to your recovery journey."},
    {"id": "pricing", "keywords": ["cost", "price", "fees", "how much"], "content": "Our pricing varies depending on the type and duration of the physiotherapy service. For detailed information on consultation fees and package rates, please contact us directly or refer to the 'Pricing' section on our website (if available). We also offer various payment options."},
    {"id": "preparation", "keywords": ["prepare for appointment", "first visit", "what to bring"], "content": "For your first appointment, please bring any relevant medical reports, X-rays, or MRI scans. It's also advisable to wear comfortable clothing that allows for easy movement during assessment and exercises. Arriving a few minutes early can help you complete any necessary paperwork."},
    {"id": "telehealth", "keywords": ["online therapy", "virtual session", "tele-physio"], "content": "Yes, we offer telehealth physiotherapy sessions! This allows you to receive expert care from the comfort of your home. You'll need a stable internet connection and a device with a camera and microphone. Please contact us to learn more about scheduling a virtual session."},
    {"id": "unrelated", "keywords": ["weather", "capital", "random"], "content": "I am an AI assistant focused on physiotherapy services. While I can't provide information on unrelated topics like weather or general knowledge, I'd be happy to help with any questions about our clinic or services!"}
]

# --- Mock LLM and RAG Function ---
def get_ai_response_from_kb(user_query):
    user_query_lower = user_query.lower()
    
    # Check for greetings
    if re.search(r'\b(hello|hi|hey|greetings)\b', user_query_lower):
        return "Hello! I'm your AI Physiotherapy Assistant. How can I help you today with our services or clinic information?"
    
    # Check for thanks
    if re.search(r'\b(thank you|thanks|appreciate)\b', user_query_lower):
        return "You're most welcome! Is there anything else I can assist you with regarding your physiotherapy needs?"
    
    # Check for closing remarks
    if re.search(r'\b(nothing else|no more|bye|goodbye)\b', user_query_lower):
        return "Alright, feel free to reach out if you have more questions later. Have a great day!"

    # Advanced RAG: Find most relevant document based on keyword matching
    best_match_doc = None
    max_matches = 0

    query_words = set(re.findall(r'\b\w+\b', user_query_lower)) # Extract words from query

    for doc in KNOWLEDGE_BASE:
        doc_content_lower = doc["content"].lower()
        
        # Combine explicit keywords with words from content for matching
        doc_keywords = set(doc.get("keywords", []))
        doc_words_from_content = set(re.findall(r'\b\w+\b', doc_content_lower))
        
        all_doc_terms = doc_keywords.union(doc_words_from_content)
        
        current_matches = len(query_words.intersection(all_doc_terms))

        if current_matches > max_matches:
            max_matches = current_matches
            best_match_doc = doc

    # Simulate LLM processing time
    time.sleep(1.5)

    if best_match_doc and max_matches > 0:
        # If a relevant document is found, return its content
        return best_match_doc["content"]
    else:
        # Fallback for queries not directly matched
        if re.search(r'\b(physiotherapy|clinic|services|appointment)\b', user_query_lower):
            return "I can help with questions about our physiotherapy services, booking appointments, clinic location, or contact details. Could you please specify what you're looking for?"
        else:
            return "I apologize, but I couldn't find a direct answer to that in my knowledge base. My purpose is to assist with questions related to physiotherapy services and our clinic. Could you please ask something else or rephrase your question?"

# --- Real-Time Chat with WebSocket ---
@socketio.on('send_message', namespace='/chat')
def handle_send_message(data):
    user_message_text = data.get("text")
    # The frontend is now sending the actual logged-in username in the 'username' field.
    username = data.get("username")

    if user_message_text and username:
        # Emit user's message immediately
        emit('receive_message', {
            'text': user_message_text,
            'username': username, # This will be the logged-in username from frontend
            'timestamp': datetime.now().strftime("%I:%M %p")
        }, broadcast=True, namespace='/chat')

        # Simulate AI typing...
        # Note: Frontend needs to handle 'isTyping' and 'clear_typing_indicator'
        # to display and remove the typing status effectively.
        emit('receive_message', {
            'text': 'Typing...',
            'username': 'AI Assistant',
            'timestamp': datetime.now().strftime("%I:%M %p"),
            'isTyping': True # Indicator for frontend
        }, room=request.sid, namespace='/chat') # Only send typing indicator to the sender


        # Get AI response
        ai_response_text = get_ai_response_from_kb(user_message_text)

        # Remove typing indicator for the sender before sending actual response
        # A more robust solution might clear it based on a message ID or type
        emit('clear_typing_indicator', {'username': 'AI Assistant'}, room=request.sid, namespace='/chat')


        # Emit AI's response
        emit('receive_message', {
            'text': ai_response_text,
            'username': 'AI Assistant',
            'timestamp': datetime.now().strftime("%I:%M %p")
        }, broadcast=True, namespace='/chat')
    else:
        print("Received malformed message:", data)


# --- IMPORTANT FOR PRODUCTION DEPLOYMENT ON RENDER ---
# The `if __name__ == '__main__':` block below is typically used for local development.
# For production on platforms like Render, a WSGI server (like Gunicorn) is used
# to run the application. You will specify the start command on Render's dashboard.
# Therefore, you should remove or comment out the socketio.run() call.

# If you were running locally, you would use:
# if __name__ == '__main__':
#     socketio.run(app, host='0.0.0.0', port=5000, debug=True)

# For Render deployment, ensure your `requirements.txt` includes:
# gunicorn
# eventlet # or gevent

# And your Render "Start Command" should be:
# gunicorn --worker-class eventlet -w 1 exercise:socketio.wsgi_app --bind 0.0.0.0:$PORT
# OR if your main Flask app (`app`) handles Flask-SocketIO directly without `socketio.wsgi_app` needing to be explicitly passed:
# gunicorn --worker-class eventlet -w 1 exercise:app --bind 0.0.0.0:$PORT
# (The `exercise:socketio.wsgi_app` is generally more explicit and safer for Flask-SocketIO setups)