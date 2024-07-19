import React, { useState, useRef, useEffect } from "react";
import "./App.css";

const userAvatar = "https://via.placeholder.com/40?text=User";
const aiAvatar = "https://via.placeholder.com/40?text=AI";

function App() {
  const [userInput, setUserInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState("");
  const chatWindowRef = useRef(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [conversationHistory, currentAssistantMessage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const newUserMessage = { role: "user", content: userInput };
    setConversationHistory((prev) => [...prev, newUserMessage]);
    setUserInput("");
    setIsGenerating(true);
    setCurrentAssistantMessage("");

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userInput,
          history: [...conversationHistory, newUserMessage],
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAssistantMessage = "";

      const processStream = async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                setIsGenerating(false);
                const assistantMessage = fullAssistantMessage;
                setConversationHistory((prev) => [
                  ...prev,
                  { role: "assistant", content: assistantMessage },
                ]);
                setCurrentAssistantMessage("");
              } else if (data.startsWith("{")) {
                // Ignore history updates from the server
              } else {
                fullAssistantMessage += data;
                setCurrentAssistantMessage(fullAssistantMessage);
              }
            }
          }
        }
      };

      await processStream();
    } catch (error) {
      console.error("Error:", error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Chat Assistant</h1>
      </header>
      <main className="chat-container">
        <div className="chat-window" ref={chatWindowRef}>
          {conversationHistory.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <img
                src={message.role === "user" ? userAvatar : aiAvatar}
                alt={`${message.role} avatar`}
                className="avatar"
              />
              <div className="message-content">{message.content}</div>
            </div>
          ))}
          {isGenerating && currentAssistantMessage && (
            <div className="message assistant">
              <img src={aiAvatar} alt="AI avatar" className="avatar" />
              <div className="message-content">{currentAssistantMessage}</div>
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message here..."
            disabled={isGenerating}
          />
          <button type="submit" disabled={isGenerating}>
            {isGenerating ? (
              <span className="loader"></span>
            ) : (
              <span className="send-icon">➤</span>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
