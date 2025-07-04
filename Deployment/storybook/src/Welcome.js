import React, { useRef, useEffect, useState } from "react";
import "./App.css";

export default function Welcome({ onStart }) {
    const videoRef = useRef(null);
    const [showRegister, setShowRegister] = useState(false);
    const [loginData, setLoginData] = useState({ username: "", password: "" });
    const [registerData, setRegisterData] = useState({
        username: "",
        password: "",
        mobile: "",
        gmail: ""
    });
    const [loginError, setLoginError] = useState("");
    const [registerError, setRegisterError] = useState("");
    const [loginSuccess, setLoginSuccess] = useState(false); // <-- Add this

    // Try to play with sound if user interacts anywhere on the welcome screen
    useEffect(() => {
        const enableSound = () => {
            if (videoRef.current) {
                videoRef.current.muted = false;
                videoRef.current.play();
            }
            window.removeEventListener("click", enableSound);
        };
        window.addEventListener("click", enableSound);
        return () => window.removeEventListener("click", enableSound);
    }, []);

    const handleLoginChange = (e) => {
        setLoginData({ ...loginData, [e.target.name]: e.target.value });
    };

    const handleRegisterChange = (e) => {
        setRegisterData({ ...registerData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");
        try {
            // Detect device type (web or android)
            const deviceType = /android/i.test(navigator.userAgent) ? "android" : "web";
            const res = await fetch("http://localhost:5000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...loginData, device_type: deviceType }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setLoginError("");
                setLoginSuccess(true); // Show success
                setTimeout(() => {
                    setLoginData({ username: "", password: "" }); // Clear fields AFTER success shown
                    setLoginSuccess(false); // Reset success message
                    onStart(); // Proceed to next view
                }, 1000);
            } else {
                setLoginError("Incorrect Credentials");
                setLoginData({ username: "", password: "" });
            }
        } catch (err) {
            setLoginError("Server Error. Please try again.");
            setLoginData({ username: "", password: "" });
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegisterError(""); // Clear previous error
        try {
            const res = await fetch("http://localhost:5000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registerData),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setShowRegister(false);
                setRegisterData({ username: "", password: "", mobile: "", gmail: "" });
                alert("Registration successful! Please log in.");
            } else if (res.status === 409) {
                setRegisterError("User already registered");
            } else {
                setRegisterError(data.message || "Registration failed. Please try again.");
            }
        } catch (err) {
            setRegisterError("Server Error. Please try again.");
        }
    };

    return (
        <div className="storybook-bg welcome-bg">
            <video
                ref={videoRef}
                autoPlay
                loop
                muted // will be unmuted on first user click
                className="welcome-video"
                style={{
                    position: "absolute",
                    width: "100vw",
                    height: "100vh",
                    objectFit: "cover",
                    zIndex: 0,
                    left: 0,
                    top: 0,
                }}
            >
                {/* Place your video file (e.g., welcome.mp4) in the public folder and use the relative path */}
                <source src="/welcome.mp4" type="video/mp4" />
            </video>
            <div className="welcome-overlay">
                <h1 className="storybook-title" style={{ fontSize: "2.8rem" }}>
                    🧒👧 Welcome to AI Storybook! 📚
                </h1>
                {!showRegister ? (
                    loginSuccess ? (
                        <div
                            style={{
                                color: "#2196f3", // Changed to blue
                                fontWeight: "bold",
                                fontSize: "2.5rem",
                                margin: "2rem",
                                textShadow: "0 2px 8px #222"
                            }}
                        >
                            Login successful!
                        </div>
                    ) : (
                        <form
                            onSubmit={handleLogin}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "1rem",
                                margin: "2rem 0"
                            }}
                        >
                            <input
                                type="text"
                                name="username"
                                value={loginData.username}
                                onChange={handleLoginChange}
                                placeholder="User Name"
                                style={{
                                    background: "rgba(255,255,255,0.25)",
                                    border: "2px solid #ff9800",
                                    borderRadius: "1rem",
                                    padding: "0.7rem 1.2rem",
                                    color: "#ff9800",
                                    fontSize: "1.1rem",
                                    outline: "none",
                                    width: "240px"
                                }}
                                required
                            />
                            <input
                                type="password"
                                name="password"
                                value={loginData.password}
                                onChange={handleLoginChange}
                                placeholder="Password"
                                style={{
                                    background: "rgba(255,255,255,0.25)",
                                    border: "2px solid #ff9800",
                                    borderRadius: "1rem",
                                    padding: "0.7rem 1.2rem",
                                    color: "#ff9800",
                                    fontSize: "1.1rem",
                                    outline: "none",
                                    width: "240px"
                                }}
                                required
                            />
                            {loginError && (
                                <div style={{ color: "#ff3333", fontWeight: "bold" }}>
                                    {loginError}
                                </div>
                            )}
                            <button className="storybook-btn welcome-btn" type="submit">
                                Login
                            </button>
                            <div style={{ marginTop: "0.5rem", color: "#fff" }}>
                                New here?{" "}
                                <span
                                    style={{ textDecoration: "underline", cursor: "pointer", color: "#ffd700" }}
                                    onClick={() => setShowRegister(true)}
                                >
                                    Register
                                </span>
                            </div>
                        </form>
                    )
                ) : (
                    <form
                        onSubmit={handleRegister}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "1rem",
                            margin: "2rem 0"
                        }}
                    >
                        <input
                            type="text"
                            name="username"
                            value={registerData.username}
                            onChange={handleRegisterChange}
                            placeholder="User Name"
                            style={{
                                background: "rgba(255,255,255,0.25)",
                                border: "2px solid #ff9800",
                                borderRadius: "1rem",
                                padding: "0.7rem 1.2rem",
                                color: "#ff9800",
                                fontSize: "1.1rem",
                                outline: "none",
                                width: "240px"
                            }}
                            required
                        />
                        <input
                            type="password"
                            name="password"
                            value={registerData.password}
                            onChange={handleRegisterChange}
                            placeholder="Password"
                            style={{
                                background: "rgba(255,255,255,0.25)",
                                border: "2px solid #ff9800",
                                borderRadius: "1rem",
                                padding: "0.7rem 1.2rem",
                                color: "#ff9800",
                                fontSize: "1.1rem",
                                outline: "none",
                                width: "240px"
                            }}
                            required
                        />
                        <input
                            type="text"
                            name="mobile"
                            value={registerData.mobile}
                            onChange={handleRegisterChange}
                            placeholder="Mobile Number"
                            style={{
                                background: "rgba(255,255,255,0.25)",
                                border: "2px solid #ff9800",
                                borderRadius: "1rem",
                                padding: "0.7rem 1.2rem",
                                color: "#ff9800",
                                fontSize: "1.1rem",
                                outline: "none",
                                width: "240px"
                            }}
                            required
                            pattern="[0-9]{10,15}"
                            title="Enter a valid mobile number"
                        />
                        <input
                            type="email"
                            name="gmail"
                            value={registerData.gmail}
                            onChange={handleRegisterChange}
                            placeholder="Gmail"
                            style={{
                                background: "rgba(255,255,255,0.25)",
                                border: "2px solid #ff9800",
                                borderRadius: "1rem",
                                padding: "0.7rem 1.2rem",
                                color: "#ff9800",
                                fontSize: "1.1rem",
                                outline: "none",
                                width: "240px"
                            }}
                            required
                            pattern=".+@gmail\.com"
                            title="Enter a valid Gmail address"
                        />
                        {registerError && (
                            <div style={{ color: "#ff3333", fontWeight: "bold" }}>
                                {registerError}
                            </div>
                        )}
                        <button className="storybook-btn welcome-btn" type="submit">
                            Register
                        </button>
                        <div style={{ marginTop: "0.5rem", color: "#fff" }}>
                            Already have an account?{" "}
                            <span
                                style={{ textDecoration: "underline", cursor: "pointer", color: "#ffd700" }}
                                onClick={() => setShowRegister(false)}
                            >
                                Login
                            </span>
                        </div>
                    </form>
                )}
            </div>
            <div
                style={{
                    position: "absolute",
                    bottom: 10,
                    width: "100%",
                    textAlign: "center",
                    fontWeight: "bold",
                    letterSpacing: "1px",
                    fontSize: "1.1rem",
                    zIndex: 2,
                    textShadow: "0 1px 6px #000",
                    color: "#fff"
                }}
            >
                © AISPRY 2025
            </div>
        </div>
    );
}