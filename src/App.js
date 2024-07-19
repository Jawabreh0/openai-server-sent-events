import React, { useState, useRef, useEffect } from "react";
import "./App.css";

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
              setConversationHistory((prev) => [
                ...prev,
                { role: "assistant", content: currentAssistantMessage },
              ]);
              setCurrentAssistantMessage("");
              break;
            } else if (data.startsWith("{")) {
              // Ignore history updates from the server
            } else {
              setCurrentAssistantMessage((prev) => prev + data);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="App">
      <h1>AI Chat</h1>
      <div className="chat-window" ref={chatWindowRef}>
        {conversationHistory.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <strong>{message.role === "user" ? "You" : "AI"}:</strong>{" "}
            {message.content}
          </div>
        ))}
        {isGenerating && currentAssistantMessage && (
          <div className="message assistant">
            <strong>AI:</strong> {currentAssistantMessage}
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your message"
          disabled={isGenerating}
        />
        <button type="submit" disabled={isGenerating}>
          Send
        </button>
      </form>
    </div>
  );
}

export default App;
