const socket = io();

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const colorPicker = document.getElementById("colorPicker");
const brushSizeSlider = document.getElementById("brushSize");
const eraserToggle = document.getElementById("eraserToggle");
const saveBtn = document.getElementById("saveBtn");
const username = prompt("Enter your name:") || "Anonymous";

let drawing = false;
let currentColor = "#d6336c";
let brushSize = 3;
let eraserMode = false;
let undoStack = [];
let redoStack = [];

function resizeCanvas() {
  canvas.width = window.innerWidth * 0.8;
  canvas.height = window.innerHeight * 0.6;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function drawLine(x0, y0, x1, y1, color, size, emit) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.closePath();

  if (!emit) return;
  socket.emit("draw", { x0, y0, x1, y1, color, size });
}

function saveCanvasState() {
  undoStack.push(canvas.toDataURL());
  if (undoStack.length > 20) undoStack.shift();
  redoStack = [];
}

function restoreCanvasState(dataUrl) {
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0);
  img.src = dataUrl;
}

let lastX = 0, lastY = 0;

canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  lastX = e.offsetX;
  lastY = e.offsetY;
  saveCanvasState();
});

canvas.addEventListener("mouseup", () => {
  drawing = false;
});

canvas.addEventListener("mouseout", () => {
  drawing = false;
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  const color = eraserMode ? "#ffffff" : currentColor;
  drawLine(lastX, lastY, e.offsetX, e.offsetY, color, brushSize, true);
  lastX = e.offsetX;
  lastY = e.offsetY;
});

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  lastX = touch.clientX - rect.left;
  lastY = touch.clientY - rect.top;
  drawing = true;
  saveCanvasState();
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (!drawing) return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const currentX = touch.clientX - rect.left;
  const currentY = touch.clientY - rect.top;
  const color = eraserMode ? "#ffffff" : currentColor;
  drawLine(lastX, lastY, currentX, currentY, color, brushSize, true);
  lastX = currentX;
  lastY = currentY;
});

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  drawing = false;
});

socket.on("draw", ({ x0, y0, x1, y1, color, size }) => {
  drawLine(x0, y0, x1, y1, color, size, false);
});

document.getElementById("clearBtn").addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  socket.emit("clearCanvas");
});

socket.on("clearCanvas", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
});

colorPicker.addEventListener("input", (e) => {
  currentColor = e.target.value;
});

brushSizeSlider.addEventListener("input", (e) => {
  brushSize = parseInt(e.target.value);
});

eraserToggle.addEventListener("change", (e) => {
  eraserMode = e.target.checked;
});

saveBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${username}_drawing.png`;
  link.href = canvas.toDataURL();
  link.click();
});

document.getElementById("undoBtn").addEventListener("click", () => {
  if (undoStack.length > 0) {
    const last = undoStack.pop();
    redoStack.push(canvas.toDataURL());
    restoreCanvasState(last);
  }
});

document.getElementById("redoBtn").addEventListener("click", () => {
  if (redoStack.length > 0) {
    const next = redoStack.pop();
    undoStack.push(canvas.toDataURL());
    restoreCanvasState(next);
  }
});
