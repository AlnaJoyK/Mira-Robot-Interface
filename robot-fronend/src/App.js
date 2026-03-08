// Mira Frontend - Connected to FastAPI Backend

import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [destination, setDestination] = useState("");
  const [image1, setImage1] = useState("");
  const [image2, setImage2] = useState("");
  const [showLocationBox, setShowLocationBox] = useState(false);
  const [loading, setLoading] = useState(false);
  const dismissTimerRef = useRef(null);

  // Load voices properly
  useEffect(() => {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);

  // Clear 2-minute auto-dismiss timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // 🔊 Text-to-Speech
  const speakAnswer = (text) => {
    if (!("speechSynthesis" in window)) {
      console.warn("Speech Synthesis not supported");
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (voice) =>
        voice.lang === "en-US" &&
        voice.name.toLowerCase().includes("female")
    );

    if (preferredVoice) {
      speech.voice = preferredVoice;
    }

    window.speechSynthesis.speak(speech);
  };

  // Hide location box and clear dismiss timer
  const hideLocationBox = () => {
    setShowLocationBox(false);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  };

  // 🤖 Connect to Backend
  const askMira = async () => {
    if (!question) return;

    hideLocationBox();
    setLoading(true);
    setAnswer("");
    setDestination("");
    setImage1("");
    setImage2("");

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: question }),
      });

      if (!response.ok) {
        throw new Error("Server not responding");
      }

      const data = await response.json();

      setAnswer(data.reply ?? data.response ?? "");
      setDestination(data.destination ?? "");
      setImage1(data.image1 ?? "");
      setImage2(data.image2 ?? "");

      // Show location box when response includes images
      if (data.image1) {
        setShowLocationBox(true);
        // Auto-dismiss after 2 minutes
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(hideLocationBox, 2 * 60 * 1000);
      }

      speakAnswer(data.reply ?? data.response ?? "");
    } catch (error) {
      console.error("Connection error:", error);
      setAnswer(
        "⚠ Cannot connect to Mira backend. Make sure backend is running."
      );
    }

    setLoading(false);
  };

  // 🎤 Speech Recognition
  const startListening = () => {
    hideLocationBox();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = function (event) {
      const speechText = event.results[0][0].transcript;
      setQuestion(speechText);
    };

    recognition.onerror = function (event) {
      console.error("Speech recognition error:", event.error);
    };
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Mira</h1>
        <p className="subtitle">Your Smart Campus Assistant</p>

        <div className="input-section">
          <input
            type="text"
            placeholder="Ask me anything about the campus..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button onClick={askMira}>Ask</button>
          <button onClick={startListening}>🎤 Speak</button>
        </div>

        {loading && <p className="loading">Thinking...</p>}

        {answer && (
          <div className="answer-box">
            <h3>Mira says:</h3>
            <p>{answer}</p>

            {destination && (
              <div className="destination-box">
                <h4>📍 Destination:</h4>
                <p>{destination}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location / QR box - appears when response is displayed */}
      {answer && showLocationBox && image1 && (
        <div className="location-popup-box location-popup-visible">
          <img src={image1} alt="" className="location-bg-img" />
          <div className="location-popup-content">
            <div className="location-inner-qr">
              {image2 && <img src={image2} alt="QR code" className="location-qr-img" />}
            </div>
            <p className="location-scan-text">Scan the QR code to get the location</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;