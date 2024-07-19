const express = require("express");
const path = require("path");
const { OpenAI } = require("openai");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const openai = new OpenAI({
  apiKey: "your key goes here :)",
});

app.use(cors());
app.use(express.static(__dirname));
app.use(bodyParser.json());

let conversationHistory = [];

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend.html"));
});

app.post("/api/chat", async (req, res) => {
  const userPrompt =
    req.body.prompt || "Write a story about a space adventure.";
  const previousMessages = req.body.history || [];

  conversationHistory = [
    ...previousMessages,
    { role: "user", content: userPrompt },
  ];

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: conversationHistory,
      stream: true,
    });

    let assistantResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        assistantResponse += content;
        res.write(`data: ${content}\n\n`);
      }
    }

    // Add assistant's response to conversation history
    conversationHistory.push({ role: "assistant", content: assistantResponse });

    // Send the updated conversation history
    res.write(
      `data: ${JSON.stringify({
        type: "history",
        content: conversationHistory,
      })}\n\n`
    );
  } catch (error) {
    console.error("Error:", error);
    res.write(`data: An error occurred\n\n`);
  } finally {
    res.write(`data: [DONE]\n\n`);
  }
});

app.listen(8000, () => console.log("Server running on port 8000"));
