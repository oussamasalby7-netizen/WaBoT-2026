import { useEffect, useMemo, useState, useRef } from "react";
import { Bot, Send, FlaskConical } from "lucide-react";
import Button from "../components/ui/Button";
import api from "../services/api";
import { useBusiness } from "../hooks/useBusiness";
import { toast } from "sonner";
import "../styles/testlab.css";

function typewriter(text, set, speed = 12) {
  let i = 0;
  set("");
  const id = setInterval(() => {
    i += 1;
    set(text.slice(0, i));
    if (i >= text.length) clearInterval(id);
  }, speed);
  return () => clearInterval(id);
}

export default function TestLab() {
  const { business } = useBusiness();
  const businessId = useMemo(() => business?.id, [business]);

  const [prompt, setPrompt] = useState("Salam, bghit n3ref ch7al taman dyal smart watch?");
  const [aiReply, setAiReply] = useState("");
  const [rawReply, setRawReply] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [chatHistory, setChatHistory] = useState([
    { id: 1, role: "bot", text: "Hello! I am your AI assistant. How can I help you today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    if (!rawReply) return;
    return typewriter(rawReply, setAiReply, 10);
  }, [rawReply]);

  const sendPrompt = async () => {
    if (!prompt.trim()) return toast.error("Prompt is required");
    setIsLoading(true);
    try {
      const res = await api.post("/test/ai", { prompt, business_id: businessId });
      const reply = res.data?.data?.reply || "";
      setRawReply(reply);
    } catch (err) {
      toast.error(err.validationMessage || err.response?.data?.message || "AI test failed");
    } finally {
      setIsLoading(false);
    }
  };

  const sendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatHistory(prev => [...prev, { id: Date.now(), role: "user", text: userMessage }]);
    setIsChatLoading(true);

    try {
      const res = await api.post("/test/whatsapp-sandbox", {
        business_id: businessId,
        from: "212600000000",
        body: userMessage,
      });
      const botReply = res.data?.data?.ai_reply || "No response generated.";
      setChatHistory(prev => [...prev, { id: Date.now(), role: "bot", text: botReply }]);
    } catch (err) {
      toast.error(err.validationMessage || err.response?.data?.message || "Chat simulation failed");
      setChatHistory(prev => [...prev, { id: Date.now(), role: "bot", text: "⚠️ Error connecting to AI API." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="testlab-page">
      {/* Page Header */}
      <div className="testlab-header">
        <div className="testlab-header-icon">
          <FlaskConical size={24} />
        </div>
        <div>
          <h2 className="testlab-title">Test Lab</h2>
          <p className="testlab-subtitle">
            Test-only tools (AI prompt + WhatsApp sandbox). Enabled only with VITE_TEST_MODE + TEST_MODE.
          </p>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="testlab-grid">

        {/* LEFT: AI Prompt Tester */}
        <div className="testlab-panel">
          <div className="testlab-panel-header">
            <Bot size={20} style={{ color: "var(--primary)" }} />
            <span className="testlab-panel-title">AI API Tester</span>
          </div>

          <div>
            <label className="testlab-prompt-label">Prompt</label>
            <textarea
              rows={6}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="testlab-textarea"
              placeholder="Write a prompt…"
            />
          </div>

          <Button onClick={sendPrompt} isLoading={isLoading} style={{ width: "100%" }}>
            <Send size={16} style={{ marginRight: "6px" }} />
            Send to AI
          </Button>

          <div className="testlab-response-area">
            <div className="testlab-response-label">Response</div>
            <div className="testlab-response-text">{aiReply || "—"}</div>
          </div>
        </div>

        {/* RIGHT: Chat Sandbox */}
        <div className="testlab-chat-panel">
          {/* Chat Header */}
          <div className="testlab-chat-header">
            <div className="testlab-chat-avatar">
              <Bot size={20} />
            </div>
            <div>
              <div className="testlab-chat-name">Interactive Chat Sandbox</div>
              <div className="testlab-chat-sub">Uses your real AI API from .env</div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="testlab-chat-messages">
            {chatHistory.map((msg) => (
              <div key={msg.id} className={`testlab-message ${msg.role}`}>
                <div className={`testlab-bubble ${msg.role}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="testlab-message bot">
                <div className="testlab-bubble bot">
                  <div className="testlab-typing-dots">
                    <div className="testlab-dot" />
                    <div className="testlab-dot" />
                    <div className="testlab-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={sendChatMessage} className="testlab-chat-input-row">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="testlab-chat-input"
              disabled={isChatLoading}
            />
            <Button
              type="submit"
              isLoading={isChatLoading}
              disabled={!chatInput.trim()}
              className="testlab-send-btn"
            >
              <Send size={16} />
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
