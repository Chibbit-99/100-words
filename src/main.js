import { CreateMLCEngine } from "@mlc-ai/web-llm";
import "./style.css";

const $ = (id) => document.getElementById(id);
const promptInput = $("prompt");
const sendButton = $("send-button");
const chatForm = $("chat-form");
const messagesEl = $("messages");
const welcome = $("welcome");
const loadPanel = $("load-panel");
const loadLabel = $("load-label");
const loadPercent = $("load-percent");
const loadProgress = $("load-progress");
const composerHint = $("composer-hint");

let engine = null;
let loading = false;
let generating = false;
let activeModel = "";
let conversation = [];

const MODEL_ID = "SmolLM2-360M-Instruct-q4f16_1-MLC";

function setDeviceStatus(ready) {
  $("device-status").textContent = ready ? "WebGPU available" : "WebGPU unavailable";
  $("device-status").previousElementSibling.style.background = ready ? "var(--green)" : "var(--red)";
}

async function checkWebGPU() {
  if (!("gpu" in navigator)) {
    setDeviceStatus(false);
    composerHint.textContent = "WebGPU is not available in this browser";
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No compatible GPU adapter found");
    setDeviceStatus(true);
    composerHint.textContent = "Loading SmolLM2-360M…";
    return true;
  } catch (error) {
    setDeviceStatus(false);
    composerHint.textContent = error.message || "Could not access WebGPU";
    return false;
  }
}

function setBusy(busy) {
  promptInput.disabled = busy || !engine;
  sendButton.disabled = busy || !engine || !promptInput.value.trim();
  $("new-chat").disabled = busy;
  $("clear-chat").disabled = busy;
}

function showProgress(text, progress) {
  loadPanel.hidden = false;
  loadLabel.textContent = text || "Preparing model…";
  const percent = Math.max(0, Math.min(100, Math.round((progress || 0) * 100)));
  loadPercent.textContent = percent + "%";
  loadProgress.style.width = percent + "%";
}

function hideProgress() {
  loadPanel.hidden = true;
}

async function loadModel() {
  if (loading || (engine && activeModel === MODEL_ID)) return;
  loading = true;
  engine = null;
  activeModel = "";
  setBusy(true);
  composerHint.textContent = "Downloading and preparing the model…";
  showProgress("Starting model…", 0);
  try {
    const nextEngine = await CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report) => showProgress(report.text, report.progress)
    });
    engine = nextEngine;
    activeModel = MODEL_ID;
    composerHint.textContent = "Ready · running locally on your device";
    promptInput.disabled = false;
    promptInput.focus();
  } catch (error) {
    console.error(error);
    composerHint.textContent = "Could not load model: " + (error.message || "unknown error");
    showProgress("Model failed to load", 0);
  } finally {
    loading = false;
    sendButton.disabled = !engine || !promptInput.value.trim();
    $("new-chat").disabled = false;
    $("clear-chat").disabled = false;
    if (engine) hideProgress();
  }
}

function addMessage(role, content = "") {
  welcome.hidden = true;
  const row = document.createElement("article");
  row.className = "message " + role;
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "Y" : "✳";
  const body = document.createElement("div");
  body.className = "message-body";
  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = role === "user" ? "YOU" : "100 WORDS";
  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent = content;
  body.append(label, text);
  row.append(avatar, body);
  messagesEl.append(row);
  row.scrollIntoView({ behavior: "smooth", block: "end" });
  return text;
}

async function sendMessage(text) {
  const content = text.trim();
  if (!content || !engine || generating || loading) return;
  conversation.push({ role: "user", content });
  addMessage("user", content);
  promptInput.value = "";
  resizeInput();
  generating = true;
  setBusy(true);
  const responseEl = addMessage("assistant", "");
  let answer = "";
  try {
    const stream = await engine.chat.completions.create({
      messages: conversation,
      stream: true,
      temperature: 0.7
    });
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        answer += delta;
        responseEl.textContent = answer;
        responseEl.parentElement.parentElement.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
    conversation.push({ role: "assistant", content: answer });
  } catch (error) {
    console.error(error);
    responseEl.textContent = answer || "Something went wrong while generating a response. Try again.";
    if (!answer) conversation.pop();
  } finally {
    generating = false;
    setBusy(false);
    promptInput.focus();
  }
}

function resizeInput() {
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 180) + "px";
  sendButton.disabled = !engine || loading || generating || !promptInput.value.trim();
}

function clearChat() {
  conversation = [];
  messagesEl.replaceChildren();
  welcome.hidden = false;
  promptInput.focus();
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(promptInput.value);
});
promptInput.addEventListener("input", resizeInput);
promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});
$("new-chat").addEventListener("click", clearChat);
$("clear-chat").addEventListener("click", clearChat);
document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => {
    promptInput.value = button.dataset.prompt;
    resizeInput();
    promptInput.focus();
  });
});

checkWebGPU().then((available) => {
  if (available) loadModel();
});
