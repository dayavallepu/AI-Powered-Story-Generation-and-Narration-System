from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import re
import time
import config
from pymongo import MongoClient
import textstat
from datetime import datetime

app = Flask(__name__)
CORS(app)

# MongoDB setup
client = MongoClient("mongodb://localhost:27017/")
db = client["story_app"]
feedback_collection = db["feedback"]
users_collection = db["users"]
psi_warning_collection = db["Drift_warnings"]  # Collection for storing PSI warnings
login_logs_collection = db["login_logs"]  # Add this line for the new collection

# Gemini API setup
api_key = config.API_KEY
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")

# Flesch score mapping
flesch_map = {
    "3-8": (80, 100),
    "9-15": (60, 80),
    "16-19": (50, 60),
    "20+": (30, 50),
}

def get_flesch_band(age_range):
    score_min, score_max = 30, 100  # default
    for k, (minv, maxv) in flesch_map.items():
        if "-" in k and "-" in age_range:
            k_start, k_end = map(int, k.split("-"))
            a_start, a_end = map(int, age_range.split("-"))
            if a_start >= k_start and a_end <= k_end:
                score_min, score_max = minv, maxv
                break
        elif "+" in k and "+" in age_range:
            score_min, score_max = flesch_map[k]
            break
    return score_min, score_max

def calculate_psi(speed, flesch_score, story_length):
    # Example weights, adjust as needed
    speed_weight = 0.3
    flesch_weight = 0.4
    length_weight = 0.3
    psi = (speed_weight * speed) + (flesch_weight * flesch_score) + (length_weight * (story_length / 1000))
    return round(psi, 2)

@app.route("/generate_story", methods=["POST"])
def generate_story():
    data = request.json
    age_range = data.get("age_range")
    genre = data.get("genre")
    theme = data.get("theme")
    characters = data.get("characters")
    language = data.get("language", "")

    score_min, score_max = get_flesch_band(age_range)
    flesch_score = f"{score_min}–{score_max}"

    prompt = f"""
    Write an imaginative and age-appropriate story for Indian children aged {age_range}.

    Requirements:
    - Genre: {genre}
    - Main Characters: {characters}
    - Theme: {theme}
    - Story Length: Maximum 350 words.
    - Use simple, clear English vocabulary and sentence structure that is suitable for children aged {age_range}.
    - The story MUST be written so that its Flesch Reading Ease (FRE) score is between {flesch_score}. 
    - The Flesch score requirement applies ONLY to the English story.
    - DO NOT include any translation, non-English words, or translation labels in the English story section.
    - Avoid complex words and long sentences for younger ages; use more advanced language for older ages.
    - Include a catchy, relevant title at the beginning.
    - End with a moral in the format: Moral: [your moral]
    - **Do NOT add any label like 'English Story:' or similar. Only use 'Title:', the story text, and 'Moral:' as shown below.**

    Format:
    Title: [Your title]
    [Story text]
    Moral: [your moral]
    """

    if age_range in ["3-5", "3-8"]:
        prompt += (
            "\n- IMPORTANT: The story MUST have a Flesch Reading Ease (FRE) score between 80 and 100."
            "\n- Use normal words and keep medium sentences (6-9 words each)."
            "\n- Avoid any very easy or very complex vocabulary."
            "\n- Imagine you are writing for a 3–8 year old who is just learning to read."
            "\n- If the story is  very easy or more difficult, REWRITE it until it fits the FRE score range."
            "\n- Do NOT write a story that is outside this FRE score range."
            "\n- If you cannot write a story within this FRE range, DO NOT RETURN ANY STORY."
        )
    elif age_range in ["9-15"]:
        prompt += (
            "\n- IMPORTANT: The story MUST have a Flesch Reading Ease (FRE) score between 60 and 80."
            "\n- The FRE score must NEVER be above 80 or below 60 for this age group."
            "\n- Use simple and clear words."
            "\n- Keep sentences short (10–14 words) and easy to understand."
            "\n- Avoid difficult vocabulary and long sentences."
            "\n- Do not use advanced or academic words."
            "\n- Imagine you are writing for a school student aged 9 to 15."
            "\n- If the story is too easy or too hard, or if the FRE score is outside 60–80, REWRITE it until it fits the FRE score range."
            "\n- You absolutely MUST NOT write a story with a Flesch score above 80 or below 60."
            "\n- Do NOT write a story that is outside this FRE score range."
            "\n- If you cannot write a story within this FRE range, DO NOT RETURN ANY STORY."
            "\n- EVEN WHEN TRANSLATING TO ANOTHER LANGUAGE, NEVER GO OUTSIDE THE FRE SCORE RANGE OF 60–80."
            "\n- Repeat: The story (and any translation) MUST have a Flesch Reading Ease (FRE) score between 60 and 80."
        )
    elif age_range in ["16-19"]:
        prompt += (
            "\n- IMPORTANT: The story MUST have a Flesch Reading Ease (FRE) score between 50 and 60."
            "\n- Use clear language with some moderately advanced vocabulary."
            "\n- Keep most sentences between 10 and 16 words."
            "\n- Mix simple and moderately complex sentences, but avoid very long or academic sentences."
            "\n- Do not use too many advanced words."
            "\n- Write as you would for a high school student aged 16 to 19."
            "\n- If the story is too easy or too hard, REWRITE it until it fits the FRE score range."
            "\n- Do NOT write a story that is outside this FRE score range."
            "\n- If you cannot write a story within this FRE range, DO NOT RETURN ANY STORY."
        )
    elif age_range in ["20+"]:
        prompt += (
            "\n- IMPORTANT: The story MUST have a Flesch Reading Ease (FRE) score between 30 and 50."
            "\n- Aim for a FRE score between 40 and 45. Do NOT write a story with a FRE score below 35 or above 45."
            "\n- Use advanced vocabulary, medium sentences, and  complex sentence structures."
            "\n- Do not simplify the language. Write as you would for college students or adults."
            "\n- If the story is very too easy (FRE > 50) or very too hard (FRE < 30), REWRITE it until it fits the FRE score range."
            "\n- Do NOT write a story that is outside this FRE score range."
            "\n- If you cannot write a story within this FRE range, DO NOT RETURN ANY STORY."
            "\n- If you do not follow the FRE rule, your answer will be rejected and regenerated."
        )

    if language and language.lower() != "none":
        lang_key = language.lower()
        labels = label_map.get(lang_key, {
            "title": "Title",
            "story": "Story",
            "moral": "Moral"
        })
        prompt += f"""

After you have finished the English story above, translate ONLY the English story and its moral into {language} for Indian children.

**Translation Instructions:**
- Do NOT translate word-for-word. Use natural, fluent, and child-friendly {language} as used in everyday conversation.
- Ensure the translated story is easy for children in the target age group to understand.
- Use age-appropriate vocabulary and grammar for {language}.
- Do NOT include any English words unless they are proper nouns.
- Write ONLY the translated version, using these labels (translated in {language}):
    - {labels['title']}: [Translated title]
    - {labels['story']}: [Translated story]
    - {labels['moral']}: [Translated moral]
- DO NOT repeat the English story or moral.
- DO NOT include any English text in this section (except proper nouns).
- Structure:
    {labels['title']}: [Translated title]
    {labels['story']}: [Translated story]
    {labels['moral']}: [Translated moral]
- Even when translating to {language}, ensure the story would have a Flesch Reading Ease (FRE) score in the same range as required for English. Do NOT make the translation easier or harder than the English version. Do NOT go outside the FRE range for the selected age group, even in translation.
"""
        # Add language-specific note if available
        if lang_key in language_notes:
            prompt += f"\n{language_notes[lang_key]}"

    try:
        start = time.time()
        MAX_ATTEMPTS = 3
        for attempt in range(MAX_ATTEMPTS):
            response = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.8,
                    "top_p": 1,
                    "top_k": 40
                }
            )
            full_text = response.text.strip()
            english_section = re.search(r"Title:.*?(?:\n|\r\n)(.*?)(?:\n|\r\n)Moral:\s*(.*)", full_text, re.DOTALL)
            if english_section:
                story_body = english_section.group(1).strip()
                flesch_score_val = round(textstat.flesch_reading_ease(story_body), 2)
                if score_min <= flesch_score_val <= score_max:
                    break
            if attempt == MAX_ATTEMPTS - 1:
                warning = f"Failed to generate a story within FRE range ({score_min}-{score_max}) after {MAX_ATTEMPTS} attempts."

        latency = round(time.time() - start, 2)
        latency_with_units = f"{latency} sec"
        full_text = response.text.strip()

        match = re.search(r"Title:\s*(.*)", full_text)
        if match:
            title = match.group(1).strip()
            story = full_text.replace(match.group(0), "").strip()
        else:
            title = full_text.split("\n")[0].strip()
            story = "\n".join(full_text.split("\n")[1:]).strip()

        # Extract moral if present
        moral_match = re.search(r"Moral:\s*(.*)", story)
        moral = moral_match.group(1).strip() if moral_match else ""

        
        # Extract only the English story (from Title: to Moral:)
        english_section = re.search(r"Title:.*?(?:\n|\r\n)(.*?)(?:\n|\r\n)Moral:\s*(.*)", full_text, re.DOTALL)
        if english_section:
            story_body = english_section.group(1).strip()
            moral = english_section.group(2).strip()
            story_text = f"{story_body}\nMoral: {moral}"
        else:
            # fallback to previous logic
            story_text = re.sub(r"Title:.*\n?", "", full_text)
            story_text = re.sub(r"Moral:.*", "", story_text)

        flesch_score_val = round(textstat.flesch_reading_ease(story_body), 2) if english_section else 0

        # Translation handling
        translated_title = ""
        translated_story = ""
        translated_moral = ""

        if language and language.lower() != "none":
            lang_key = language.lower()
            labels = label_map.get(lang_key, {
                "title": "Title",
                "story": "Story",
                "moral": "Moral"
            })
            # Try to extract the translation section
            translation_match = re.search(rf"Translation in {language}:(.*)", story, re.DOTALL | re.IGNORECASE)
            if translation_match:
                translation_text = translation_match.group(1).strip()
                # Extract translated title
                title_match = re.search(rf"{labels['title']}[:：]?\s*(.*)", translation_text)
                if title_match:
                    translated_title = title_match.group(1).strip()
                # Extract translated story
                story_match = re.search(rf"{labels['story']}[:：]?\s*([\s\S]*?)(?:\n{labels['moral']}[:：]?|$)", translation_text)
                if story_match:
                    translated_story = story_match.group(1).strip()
                # Extract translated moral
                moral_match_trans = re.search(rf"{labels['moral']}[:：]?\s*(.*)", translation_text)
                if moral_match_trans:
                    translated_moral = moral_match_trans.group(1).strip()

        speed = float(latency)
        
        # Always use the English story for length calculation
        story_length = len(story_body) if 'story_body' in locals() else len(story)

        psi = calculate_psi(speed, flesch_score_val, story_length)

        # Set your thresholds
        SPEED_THRESHOLD = 15      # seconds, example
        LENGTH_MIN = 300  # Minimum story length
        LENGTH_MAX = 1500   # Maximum story length

        drift_reasons = []
        if speed > SPEED_THRESHOLD:
            drift_reasons.append(f"Speed drift (speed={speed}s > {SPEED_THRESHOLD}s)")
        # Use age-specific Flesch min/max for drift detection
        if flesch_score_val < score_min or flesch_score_val > score_max:
            drift_reasons.append(f"Flesch drift (score={flesch_score_val} not in {score_min}-{score_max})")
        if story_length < LENGTH_MIN or story_length > LENGTH_MAX:
            drift_reasons.append(f"Length drift (length={story_length} not in {LENGTH_MIN}-{LENGTH_MAX})")
        if psi > 50:
            drift_reasons.append(f"Performance & Suitability Index drift (psi={psi} > 50)")

        warning = "; ".join(drift_reasons) if drift_reasons else ""

        if warning:
            log_psi_warning(
                data,
                psi,
                warning,
                speed,
                flesch_score_val,
                story_length,
                story,      # generated story
                title       # generated title
            )

        return jsonify({
            "title": title,
            "story": story,
            "moral": moral,
            "translated_title": translated_title,
            "translated_story": translated_story,
            "translated_moral": translated_moral,
            "latency": latency_with_units,
            "flesch_score": flesch_score_val,
            "narration_text": f"Title: {title}. {story}",
            "psi": psi,
            "warning": warning
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/submit_feedback", methods=["POST"])
def submit_feedback():
    data = request.get_json()
    feedback_collection.insert_one({
        "datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "age": data.get("age"),
        "genre": data.get("genre"),
        "theme": data.get("theme"),
        "main_characters": data.get("characters"),
        "language": data.get("language"),
        "title": data.get("title"),
        "story": data.get("story"),
        "rating": data.get("rating"),
        "feedback": data.get("feedback"),
        "latency": data.get("latency"),
        "flesch_score": data.get("flesch_score"),
        "story_length": data.get("story_length"),
        "psi": data.get("psi"),
        "warning": data.get("warning"),
    })
    return jsonify(success=True)

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    mobile = data.get("mobile")
    gmail = data.get("gmail")
    if not username or not password or not mobile or not gmail:
        return jsonify(success=False, message="Missing fields"), 400

    # Check if a user with the same username AND password exists
    if users_collection.find_one({"username": username, "password": password}):
        return jsonify(success=False, message="User already registered"), 409

    # Optionally, you can check if username exists with a different password
    # and show a different message if you want:
    # if users_collection.find_one({"username": username}):
    #     return jsonify(success=False, message="Username taken with different password"), 409

    users_collection.insert_one({
        "username": username,
        "password": password,
        "mobile": mobile,
        "gmail": gmail,
        "registered_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    return jsonify(success=True), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    device_type = data.get("device_type", "web")  # Optional: get device type from frontend

    user = users_collection.find_one({"username": username, "password": password})
    if user:
        # Save login details to login_logs collection
        login_logs_collection.insert_one({
            "datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "user_id": str(user.get("_id")),
            "username": username,
            "password": password,
            "device_type": device_type
        })
        return jsonify(success=True)
    else:
        return jsonify(success=False), 401

# Language-specific instructions and labels
language_notes = {
    "telugu": "Note: Use common Telugu words spoken in Andhra Pradesh and Telangana regions. Avoid Sanskritized or literary Telugu unless necessary.",
    "hindi": "Note: Use conversational Hindi understood by children in North India. Avoid very formal or Urdu-heavy vocabulary.",
    "french": "Note: Use simple, conversational French as spoken by children in France. Avoid overly formal or academic language.",
    "tamil": "Note: Use everyday spoken Tamil familiar to children in Tamil Nadu. Avoid highly literary or classical Tamil.",
    "kannada": "Note: Use conversational Kannada as spoken by children in Karnataka. Avoid archaic or highly formal words.",
    "marathi": "Note: Use simple, conversational Marathi as spoken by children in Maharashtra. Avoid overly formal or Sanskritized words.",
    "bengali": "Note: Use everyday Bengali as spoken by children in West Bengal. Avoid highly literary or archaic words.",
    # Add more languages as needed
}

label_map = {
    "telugu": {"title": "శీర్షిక", "story": "కథ", "moral": "నీతి"},
    "hindi": {"title": "शीर्षक", "story": "कहानी", "moral": "नीति"},
    "french": {"title": "Titre", "story": "Histoire", "moral": "Morale"},
    "tamil": {"title": "தலைப்பு", "story": "கதை", "moral": "நீதிக்கதை"},
    "kannada": {"title": "ಶೀರ್ಷಿಕೆ", "story": "ಕಥೆ", "moral": "ನೀತಿ"},
    "marathi": {"title": "शीर्षक", "story": "कथा", "moral": "नीती"},
    "bengali": {"title": "শিরোনাম", "story": "গল্প", "moral": "নৈতিকতা"},
    # Add more languages as needed
}

def log_psi_warning(data, psi, warning, speed, flesch_score, story_length, story_text, title):
    language = data.get("language")
    if language == "none" or not language:
        language = "English"
    psi_warning_collection.insert_one({
        "datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "age": data.get("age_range"),
        "genre": data.get("genre"),
        "theme": data.get("theme"),
        "main_characters": data.get("characters"),
        "language": language,
        "title": title,
        "story": story_text,
        "speed": speed,
        "flesch_score": flesch_score,
        "story_length": story_length,
        "psi": psi,
        "warning": warning
    })

if __name__ == "__main__":
    app.run(debug=True)