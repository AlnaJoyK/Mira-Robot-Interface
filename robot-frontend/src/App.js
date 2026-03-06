// Mira Frontend - Connected to FastAPI Backend

import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [destination, setDestination] = useState("");   // ⭐ NEW
  const [loading, setLoading] = useState(false);

  // Load voices properly
  useEffect(() => {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
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

  // 🤖 Connect to Backend
  const askMira = async () => {
    if (!question) return;

    setLoading(true);
    setAnswer("");
    setDestination("");   // reset previous destination

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

      setAnswer(data.reply);
      setDestination(data.destination);   // ⭐ NEW

      speakAnswer(data.reply);

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
        <h1>Mira 🤖</h1>
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

            {/* ⭐ DESTINATION DISPLAY */}
            {destination && (
              <div className="destination-box">
                <h4>📍 Destination:</h4>
                <p>{destination}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;