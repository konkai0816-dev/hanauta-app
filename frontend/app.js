const API_URL = "/recognize";
const MAX_SECONDS = 30;

const recordBtn    = document.getElementById("recordBtn");
const micIcon      = document.getElementById("micIcon");
const stopIcon     = document.getElementById("stopIcon");
const pulseRing    = document.getElementById("pulseRing");
const recordLabel  = document.getElementById("recordLabel");
const timerArea    = document.getElementById("timerArea");
const timerBar     = document.getElementById("timerBar");
const timerText    = document.getElementById("timerText");
const loadingArea  = document.getElementById("loadingArea");
const resultArea   = document.getElementById("resultArea");
const resultList   = document.getElementById("resultList");
const errorArea    = document.getElementById("errorArea");
const errorMsg     = document.getElementById("errorMsg");
const retryBtn     = document.getElementById("retryBtn");
const retryBtnError = document.getElementById("retryBtnError");

let mediaRecorder = null;
let audioChunks   = [];
let timerInterval = null;
let elapsed       = 0;

recordBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecording();
  } else {
    startRecording();
  }
});

retryBtn.addEventListener("click", reset);
retryBtnError.addEventListener("click", reset);

async function startRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    showError("マイクへのアクセスが許可されていません。\nブラウザの設定を確認してください。");
    return;
  }

  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
  mediaRecorder.onstop = handleRecordingStop;
  mediaRecorder.start();

  recordBtn.classList.add("recording");
  micIcon.classList.add("hidden");
  stopIcon.classList.remove("hidden");
  pulseRing.classList.add("active");
  recordLabel.textContent = "タップして録音停止";
  timerArea.classList.remove("hidden");

  elapsed = 0;
  updateTimer();
  timerInterval = setInterval(() => {
    elapsed++;
    updateTimer();
    if (elapsed >= MAX_SECONDS) stopRecording();
  }, 1000);
}

function updateTimer() {
  timerText.textContent = `${elapsed} / ${MAX_SECONDS}秒`;
  timerBar.style.width = `${(elapsed / MAX_SECONDS) * 100}%`;
}

function stopRecording() {
  clearInterval(timerInterval);
  mediaRecorder.stop();
  mediaRecorder.stream.getTracks().forEach((t) => t.stop());

  recordBtn.classList.remove("recording");
  micIcon.classList.remove("hidden");
  stopIcon.classList.add("hidden");
  pulseRing.classList.remove("active");
  recordLabel.textContent = "タップして録音開始";
  timerArea.classList.add("hidden");
  timerBar.style.width = "0%";
}

async function handleRecordingStop() {
  showLoading();

  const blob = new Blob(audioChunks, { type: "audio/webm" });
  const formData = new FormData();
  formData.append("audio", blob, "audio.webm");

  try {
    const res = await fetch(API_URL, { method: "POST", body: formData });
    if (!res.ok) throw new Error(`サーバーエラー (${res.status})`);
    const data = await res.json();
    handleResult(data);
  } catch {
    showError("サーバーとの通信に失敗しました。\nバックエンドが起動しているか確認してください。");
  }
}

function handleResult(data) {
  hideAll();

  if (data.status === "success") {
    resultList.innerHTML = "";
    data.results.forEach((item) => {
      const li = document.createElement("li");
      li.classList.add(`rank-${item.rank}`);

      const rankLabels = ["1st", "2nd", "3rd"];
      const label = rankLabels[item.rank - 1] || `${item.rank}位`;

      li.innerHTML = `
        <div class="rank-badge">${label}</div>
        <div class="result-info">
          <div class="result-title">${escapeHtml(item.title)}</div>
          <div class="result-artist">${escapeHtml(item.artist)}${item.album ? " · " + escapeHtml(item.album) : ""}</div>
        </div>
        <div class="score-area">
          <span class="score-num">${item.score}%</span>
          <div class="score-bar-bg">
            <div class="score-bar" style="width:${item.score}%"></div>
          </div>
        </div>
      `;
      resultList.appendChild(li);
    });
    resultArea.classList.remove("hidden");

  } else if (data.status === "no_result") {
    showError("曲を特定できませんでした。\nサビ部分をもう少し長めに、はっきり歌ってみてください。");

  } else {
    showError(data.message || "認識に失敗しました。");
  }
}

function showLoading() {
  document.getElementById("recordArea").classList.add("hidden");
  loadingArea.classList.remove("hidden");
  resultArea.classList.add("hidden");
  errorArea.classList.add("hidden");
}

function hideAll() {
  loadingArea.classList.add("hidden");
  resultArea.classList.add("hidden");
  errorArea.classList.add("hidden");
}

function showError(msg) {
  hideAll();
  document.getElementById("recordArea").classList.add("hidden");
  errorMsg.textContent = msg;
  errorArea.classList.remove("hidden");
}

function reset() {
  hideAll();
  document.getElementById("recordArea").classList.remove("hidden");
  timerBar.style.width = "0%";
  elapsed = 0;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
