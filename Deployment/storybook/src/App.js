import React, { useState } from "react";
import axios from "axios";
import "./App.css";
import Welcome from "./Welcome";

const ageOptions = [
  { label: "3–8 (Early Readers)", value: "3-8" },
  { label: "9–15 (Middle Schoolers)", value: "9-15" },
  { label: "16–19 (Teens/Young Adults)", value: "16-19" },
  { label: "20+ (Adults)", value: "20+" },
];

const genreOptions = [
  "Fantasy",
  "Adventure",
  "Animal Tale",
  "Magical Tale",
  "Sci-Fi",
  "Comedy",
];

const themeOptions = [
  "Kindness",
  "Teamwork",
  "Curiosity",
  "Patience",
  "Friendship",
  "Honesty",
  "Courage",
];

const languageOptions = [
  { label: "Default English", value: "none" },
  { label: "Hindi", value: "hindi" },
  { label: "Telugu", value: "telugu" },
  { label: "Tamil", value: "tamil" },
  { label: "Kannada", value: "kannada" },
  { label: "Marathi", value: "marathi" },
  { label: "Bengali", value: "bengali" },
  { label: "French", value: "french" },
  // Add more as needed
];

// Helper: map language value to speechSynthesis language code
const languageSpeechMap = {
  none: "en-GB",
  hindi: "hi-IN",
  telugu: "te-IN",
  tamil: "ta-IN",
  kannada: "kn-IN",
  marathi: "mr-IN",
  bengali: "bn-IN",
  french: "fr-FR",
  // Add more as needed
};

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [age, setAge] = useState("");
  const [genre, setGenre] = useState([]);
  const [theme, setTheme] = useState([]);
  const [characters, setCharacters] = useState("");
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [rating, setRating] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);
  const [manualGenre, setManualGenre] = useState("");
  const [manualTheme, setManualTheme] = useState("");
  const [language, setLanguage] = useState("none");
  const synth = window.speechSynthesis;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStory(null);
    setFeedback("");
    setFeedbackSent(false);
    try {
      const res = await axios.post("http://localhost:5000/generate_story", {
        age_range: age,
        genre: [...genre, ...(manualGenre ? [manualGenre] : [])].join(", "),
        theme: [...theme, ...(manualTheme ? [manualTheme] : [])].join(", "),
        characters,
        language, // <-- pass selected language
      });
      setStory(res.data);
    } catch (err) {
      setStory({
        title: "Error",
        story: "Could not generate story.",
        moral: "",
        latency: 0,
      });
    }
    setLoading(false);
  };

  const handleFeedback = async () => {
    // Determine language string for saving
    let languageToSave = "English";
    if (language !== "none") {
      const otherLang = languageOptions.find(l => l.value === language)?.label;
      if (otherLang) languageToSave = `English, ${otherLang}`;
    }

    await axios.post("http://localhost:5000/submit_feedback", {
      age,
      genre: [...genre, ...(manualGenre ? [manualGenre] : [])].join(", "),
      theme: [...theme, ...(manualTheme ? [manualTheme] : [])].join(", "),
      characters,
      feedback,
      rating,
      story: story.story,
      title: story.title,
      latency: story.latency,
      flesch_score: story.flesch_score,
      story_length: (story.english_story || story.story).split(/(?:\n|^)Moral:?/i)[0].trim().length,
      language: languageToSave,
      psi: story.psi,
      warning: story.warning ? story.warning : "none", // <-- always send a value
    });
    setFeedbackSent(true);
  };

  const handleNarrate = () => {
    if (!story) return;
    synth.cancel(); // Always cancel before starting new narration

    // Narrate title, then pause, then story, then pause, then moral
    const narrationParts = [
      `Title: ${story.title}`,
      "__PAUSE__",
      story.story.replace(
        new RegExp(`\\s*Moral:?\\s*${story.moral.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
        ''
      ).trim(),
      "__PAUSE__",
      `Moral: ${story.moral}`
    ];

    let idx = 0;
    setIsNarrating(true);

    function speakNext() {
      if (idx >= narrationParts.length) {
        setIsNarrating(false);
        return;
      }
      if (narrationParts[idx] === "__PAUSE__") {
        setTimeout(() => {
          idx++;
          speakNext();
        }, 1000); // 1 second pause
        return; // <-- This ensures only the pause runs, not the rest
      }
      const utterance = new window.SpeechSynthesisUtterance(narrationParts[idx]);
      utterance.rate = 0.85;
      utterance.pitch = 1.00;
      utterance.volume = 1.0;
      utterance.lang = "en-GB";
      utterance.onend = () => {
        idx++;
        speakNext();
      };
      synth.speak(utterance);
    }

    speakNext();
  };

  const handleStopNarration = () => {
    synth.cancel();
    setIsNarrating(false);
  };

  const handleNarrateTranslated = () => {
    if (!story || language === "none") return;
    const labels = {
      hindi: { title: "शीर्षक", story: "कहानी" },
      telugu: { title: "శీర్షిక", story: "కథ" },
      tamil: { title: "தலைப்பு", story: "கதை" },
      kannada: { title: "ಶೀರ್ಷಿಕೆ", story: "ಕಥೆ" },
      marathi: { title: "शीर्षक", story: "कथा" },
      bengali: { title: "শিরোনাম", story: "গল্প" },
      french: { title: "Titre", story: "Histoire" },
      // Add more as needed
    };
    const langLabels = labels[language];
    if (!langLabels) return;

    // Extract translated title and story
    const titleRegex = new RegExp(`${langLabels.title}[:：]?\\s*(.*)`, "i");
    const storyRegex = new RegExp(`${langLabels.story}[:：]?\\s*([\\s\\S]*?)(?=\\n\\w+[:：]|$)`, "i");
    const titleMatch = story.story.match(titleRegex);
    const storyMatch = story.story.match(storyRegex);

    const translatedTitle = titleMatch ? titleMatch[1].trim() : "";
    const translatedStory = storyMatch ? storyMatch[1].trim() : "";

    if (!translatedTitle && !translatedStory) return;

    // Narrate with pauses after section labels
    const narrationParts = [
      `${langLabels.title}:`, "__PAUSE__",
      translatedTitle, "__PAUSE__",
      `${langLabels.story}:`, "__PAUSE__",
      translatedStory
    ];

    let idx = 0;
    setIsNarrating(true);

    function speakNext() {
      if (idx >= narrationParts.length) {
        setIsNarrating(false);
        return;
      }
      if (narrationParts[idx] === "__PAUSE__") {
        setTimeout(() => {
          idx++;
          speakNext();
        }, 500); // 1 second pause after label
        return;
      }
      const utterance = new window.SpeechSynthesisUtterance(narrationParts[idx].trim());
      utterance.rate = 1.00;
      utterance.pitch = 1.00;
      utterance.volume = 1.0;
      utterance.lang = languageSpeechMap[language] || "en-GB";
      utterance.onend = () => {
        idx++;
        speakNext();
      };
      synth.speak(utterance);
    }

    synth.cancel();
    speakNext();
  };

  if (showWelcome) {
    return <Welcome onStart={() => setShowWelcome(false)} />;
  }

  return (
    <div className="storybook-bg">
      <video
        autoPlay
        loop
        muted
        className="welcome-video"
        style={{
          position: "fixed",
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          zIndex: 0,
          left: 0,
          top: 0,
        }}
      >
        <source src="/appbg.mp4" type="video/mp4" />
      </video>
      <div
        className="storybook-container"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "900px", // decreased card width
          width: "85%",      // slightly less width for responsiveness
          margin: "2.5rem auto",
          background: "rgba(255,255,255,0.75)", // less transparent (more solid)
          borderRadius: "1.5rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: "2.5rem 2.5rem 2rem 2.5rem"
        }}
      >
        {/* Home Button at Bottom Right */}
        <button
          className="storybook-btn"
          style={{
            position: "fixed",
            bottom: 30,
            right: 30,
            fontSize: "1.2rem",
            padding: "0.7rem 2rem",
            borderRadius: "1.5rem",
            zIndex: 2,
            background: "linear-gradient(90deg, #f9d423 0%, #ff4e50 100%)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
          onClick={() => {
            synth.cancel(); // Stop narration
            setIsNarrating(false);
            // Reset all input and story state
            setAge("");
            setGenre([]);
            setTheme([]);
            setManualGenre("");
            setManualTheme("");
            setCharacters("");
            setStory(null);
            setFeedback("");
            setFeedbackSent(false);
            setRating(0);
            setLoading(false);
            setLanguage("none"); // <-- Reset language
            setShowWelcome(true);
          }}
        >
          🏠 Home
        </button>
        {/* Regenerate Story Button at Bottom Left */}
        <button
          className="storybook-btn"
          style={{
            position: "fixed",
            bottom: 30,
            left: 30,
            fontSize: "1.2rem",
            padding: "0.7rem 2rem",
            borderRadius: "1.5rem",
            zIndex: 2,
            background: "linear-gradient(90deg, #ff9800 0%, #ffb347 100%)", // orange gradient
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            color: "#fff",
            border: "none"
          }}
          onClick={() => {
            synth.cancel(); // Stop narration
            setIsNarrating(false);
            setAge("");
            setGenre([]);
            setTheme([]);
            setManualGenre("");
            setManualTheme("");
            setCharacters("");
            setStory(null);
            setFeedback("");
            setFeedbackSent(false);
            setRating(0);
            setLoading(false);
            setLanguage("none"); // <-- Reset language
          }}
        >
          🔄 Regenerate
        </button>
        <h1 className="storybook-title">🧒👧 AI Storybook for Kids/Teens 🧒👧</h1>
        <form className="storybook-form" onSubmit={handleGenerate}>
          <label>
            <span>Select Age:</span>
            <select
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
              style={{
                width: "100%",
                minHeight: "2.2rem",
                borderRadius: "8px",
                padding: "0.5rem",
                border: "1px solid #222",
                background: "rgba(0,0,0,0.0)", // transparent background
                color: "#000",
                marginTop: "0.5rem"
              }}
            >
              <option value="">Select Age</option>
              {ageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {/* Genre Dropdown */}
          <label style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span>
              Genre:
              <span style={{ fontSize: "0.85rem", color: "#888", marginLeft: "0.5rem" }}>
                (Ctrl+Click to select multiple)
              </span>
            </span>
            <select
              multiple
              value={genre}
              onChange={e =>
                setGenre(Array.from(e.target.selectedOptions, option => option.value))
              }
              style={{
                width: "100%",
                minHeight: "2.2rem",
                borderRadius: "8px",
                padding: "0.5rem",
                border: "1px solid #222",
                background: "rgba(0,0,0,0.0)",
                color: "#000",
                marginTop: "0.5rem"
              }}
            >
              {genreOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={manualGenre}
              onChange={e => setManualGenre(e.target.value)}
              placeholder="Type other genre"
              style={{
                minWidth: "120px",
                borderRadius: "8px",
                padding: "0.5rem",
                border: "1px solid #222",
                background: "rgba(0,0,0,0.0)",
                color: "#000",
                marginTop: "0.5rem"
              }}
            />
          </label>

          {/* Theme Dropdown */}
          <label style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span>
              Theme:
              <span style={{ fontSize: "0.85rem", color: "#888", marginLeft: "0.5rem" }}>
                (Ctrl+Click to select multiple)
              </span>
            </span>
            <select
              multiple
              value={theme}
              onChange={e =>
                setTheme(Array.from(e.target.selectedOptions, option => option.value))
              }
              style={{
                width: "100%",
                minHeight: "2.2rem",
                borderRadius: "8px",
                padding: "0.5rem",
                border: "1px solid #222",
                background: "rgba(0,0,0,0.0)", // transparent background
                color: "#000",
                marginTop: "0.5rem"
              }}
            >
              {themeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={manualTheme}
              onChange={e => setManualTheme(e.target.value)}
              placeholder="Type other theme"
              style={{
                minWidth: "120px",
                borderRadius: "8px",
                padding: "0.5rem",
                border: "1px solid #222",
                background: "rgba(0,0,0,0.0)",
                color: "#000",
                marginTop: "0.5rem"
              }}
            />
          </label>
          <label>
            <span>Main Characters:</span>
            <input
              type="text"
              value={characters}
              onChange={(e) => setCharacters(e.target.value)}
              placeholder="e.g. A kind dragon and a brave rabbit"
              required
              style={{
                width: "100%",
                minHeight: "2.2rem",
                borderRadius: "8px",
                padding: "0.5rem",
                border: "1px solid #222",
                background: "rgba(0,0,0,0.0)", // transparent background
                color: "#000",
                marginTop: "0.5rem"
              }}
            />
          </label>
          {/* Language Selection */}
          <label>
            <span>Language:</span>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              style={{
                width: "100%",
                minHeight: "2.2rem",
                borderRadius: "8px",
                padding: "0.5rem",
                border: "1px solid #222",
                background: "rgba(0,0,0,0.0)",
                color: "#000",
                marginTop: "0.5rem"
              }}
            >
              {languageOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="storybook-btn"
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Story"}
          </button>
        </form>

        {story && (
          <div style={{ marginTop: "2rem" }}>
            {/* Narration Buttons */}
            <div style={{
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <button
                className="storybook-btn"
                onClick={handleNarrate}
                disabled={isNarrating}
                style={{
                  fontSize: "0.95rem",
                  padding: "0.3rem 1.1rem",
                  borderRadius: "1rem",
                  background: "rgba(255,255,255,0.25)",
                  color: "#ff9800",
                  border: "1px solid #ff9800",
                  boxShadow: "none",
                  opacity: isNarrating ? 0.6 : 1,
                  transition: "opacity 0.2s"
                }}
              >
                🔊 Narrate Story (English)
              </button>
              {language !== "none" && (
                <button
                  className="storybook-btn"
                  onClick={handleNarrateTranslated}
                  disabled={isNarrating}
                  style={{
                    fontSize: "0.95rem",
                    padding: "0.3rem 1.1rem",
                    borderRadius: "1rem",
                    background: "rgba(255,255,255,0.25)",
                    color: "#1976d2",
                    border: "1px solid #1976d2",
                    boxShadow: "none",
                    opacity: isNarrating ? 0.6 : 1,
                    transition: "opacity 0.2s"
                  }}
                >
                  🔊 Narrate Story ({languageOptions.find(l => l.value === language)?.label})
                </button>
              )}
              {/* Single Stop Narration Button */}
              <button
                className="storybook-btn"
                onClick={handleStopNarration}
                disabled={!isNarrating}
                style={{
                  fontSize: "0.95rem",
                  padding: "0.3rem 1.1rem",
                  borderRadius: "1rem",
                  background: "rgba(255,255,255,0.25)",
                  color: "#ff3333",
                  border: "1px solid #ff3333",
                  boxShadow: "none",
                  opacity: !isNarrating ? 0.6 : 1,
                  transition: "opacity 0.2s",
                  marginLeft: "1rem"
                }}
              >
                ⏹️ Stop Narration
              </button>
            </div>
            {/* English Section */}
            <h2 style={{ color: "#27ae60" }}>
              Title: {story.title}
            </h2>
            <pre style={{
              background: "none",
              border: "none",
              padding: 0,
              margin: "1rem 0",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "1.2rem",
              color: "#222",
              maxWidth: "100%",
              overflowX: "auto"
            }}>
              {story.story}
            </pre>

            {/* Translated Section */}
            {language !== "none" && (story.translated_title || story.translated_story || story.translated_moral) && (
              <div style={{ marginTop: "2.5rem", padding: "1rem", background: "#f4f8ff", borderRadius: "1rem" }}>
                <h2 style={{ color: "#27ae60" }}>
                  {story.translated_title}
                </h2>
                <div style={{
                  color: "#ff3333",
                  fontSize: "1.15rem",
                  margin: "1rem 0",
                  whiteSpace: "pre-wrap"
                }}>
                  {story.translated_story}
                </div>
                <div style={{ color: "#27ae60", fontWeight: "bold" }}>
                  <b>{languageOptions.find(l => l.value === language)?.label} Moral:</b> {story.translated_moral}
                </div>
              </div>
            )}

            <div className="storybook-latency">
              ⏱️ Generated in {String(story.latency).replace(/\s*sec\s*$/i, "")} sec
            </div>
            {/* Flesch Score Display */}
            <div className="storybook-flesch" style={{ marginTop: "0.5rem", fontSize: "1rem", color: "#555" }}>
              📖 Flesch Score: {story.flesch_score} (FRE)
            </div>
            {/* Story Length Display */}
            <div className="storybook-length" style={{ marginTop: "1rem", fontSize: "1rem", color: "#555" }}>
              
              📏 Story Length: {(story.english_story || story.story).split(/(?:\n|^)Moral:?/i)[0].trim().length} characters
            </div>
            {/* PSI Display */}
            {story.psi && (
              <div className="storybook-psi" style={{ marginTop: "0.5rem", fontSize: "1rem", color: "#ff9800" }}>
                🎯Performance & Suitability Index(PSI): {story.psi}
              </div>
            )}
            {/* Warning Display */}
            {story.warning && (
              <div className="storybook-warning" style={{ marginTop: "0.5rem", fontSize: "1rem", color: "#ff3333", fontWeight: "bold" }}>
                ⚠️ {story.warning}
              </div>
            )}
            {!feedbackSent ? (
              <div className="storybook-feedback">
                <h3>Did you like the story?</h3>
                <div style={{ marginBottom: "0.5rem" }}>
                  {[...Array(5)].map((_, i) => {
                    const isSelected = rating >= i + 1;
                    return (
                      <span
                        key={i + 1}
                        style={{
                          fontSize: "2rem",
                          color: isSelected ? "#27ae60" : "#fff",
                          textShadow: isSelected
                            ? "0 0 10px #27ae60, 0 0 18px #27ae60"
                            : "0 0 6px #42a5f5, 0 0 12px #42a5f5",
                          cursor: "pointer",
                          transition: "color 0.2s, text-shadow 0.2s",
                        }}
                        onClick={() => setRating(i + 1)}
                        role="img"
                        aria-label={`${i + 1} star`}
                      >
                        ★
                      </span>
                    );
                  })}
                </div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what you think! 😊"
                  rows={3}
                />
                <button
                  className="storybook-btn"
                  onClick={handleFeedback}
                  disabled={!feedback || !rating}
                  style={{
                    display: "block",
                    margin: "1.5rem auto 0 auto" // center the button horizontally
                  }}
                >
                  Submit Feedback
                </button>
              </div>
            ) : (
              <div className="storybook-thankyou">
                🎉 Thank you for your feedback! 🎉
              </div>
            )}
          </div>
        )}
      </div>
      {/* Copyright at the bottom center */}
      <div
        style={{
          position: "fixed",
          bottom: 10,
          width: "100%",
          textAlign: "center",
          fontWeight: "bold",
          letterSpacing: "1px",
          fontSize: "1.1rem",
          zIndex: 3,
          textShadow: "0 1px 6px #000",
          color: "#fff"
        }}
      >
        © AISPRY 2025
      </div>
    </div>
  );
}

export default App;
