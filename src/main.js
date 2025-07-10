import { SpeechifyClient } from "@speechify/api";

const client = new SpeechifyClient({
  token: import.meta.env.VITE_SPEECHIFY_TOKEN
});

// UI refs
const fileInput        = document.getElementById("fileInput");
const characterSelect  = document.getElementById("characterSelect");
const startBtn         = document.getElementById("startBtn");
const cueContainer     = document.getElementById("cueContainer");
const cueLineEl        = document.getElementById("cueLine");

let dialogues = [];  // full [{ speaker, text }]
let cues      = [];  // only the other character’s lines
let idx       = 0;

// 1) When the user picks a .txt file, parse it & fill the select
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    // split into non-empty lines
    const lines = reader.result
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    // parse out speaker & text at the first “:”
    dialogues = lines.map(line => {
      const i = line.indexOf(":");
      return i > -1
        ? { speaker: line.slice(0, i).trim(), text: line.slice(i + 1).trim() }
        : { speaker: "", text: line };
    });

    // collect unique speakers in order
    const speakers = Array.from(new Set(dialogues.map(d => d.speaker)));

    // populate dropdown
    characterSelect.innerHTML = `
      <option value="" disabled selected>Select your character</option>
      ${speakers.map(s => `<option value="${s}">${s}</option>`).join("")}
    `;
    characterSelect.disabled = false;
    startBtn.disabled       = false;
  };
  reader.readAsText(file);
});

// 2) When they hit “Start Practice”, build the cue-list
startBtn.addEventListener("click", () => {
  const me = characterSelect.value;
  if (!me) return;

  // only keep lines not by me
  cues = dialogues.filter(d => d.speaker !== me);
  idx  = 0;

  // lock the form & show the cue area
  fileInput.disabled       = true;
  characterSelect.disabled = true;
  startBtn.disabled        = true;
  cueContainer.classList.remove("hidden");
  document.body.classList.add("practice-active");
  //document.getElementById("app").classList.add("split");

  speakCue();
});

// 3) Function to TTS + play the current cue
async function speakCue() {
  if (idx >= cues.length) {
    cueLineEl.textContent = "End of scene.";
    return;
  }

  const { speaker, text } = cues[idx];
  cueLineEl.textContent   = `${speaker}: ${text}`;

  try {
    const { audioData } = await client.tts.audio.speech({
      input: text,          // if you want “Speaker: line” you can do `${speaker}: ${text}`
      voiceId: "russell",
      emotion: "angry",
      audioFormat: "wav"
    });
    const audio = new Audio(`data:audio/wav;base64,${audioData}`);
    await audio.play();
  } catch (e) {
    console.error(e);
    cueLineEl.textContent = "Error speaking cue";
  }
}

// 4) Advance on Spacebar
document.addEventListener("keydown", e => {
  if (e.code === "Space" && !cueContainer.classList.contains("hidden")) {
    e.preventDefault();
    idx += 1;
    speakCue();
  }
});
