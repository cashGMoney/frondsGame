/* app.js */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyBy-C9V_IOMUyapWxVEvjREZIYJ2KoarB8",
  authDomain: "frondsgame.firebaseapp.com",
  projectId: "frondsgame",
  storageBucket: "frondsgame.firebasestorage.app",
  messagingSenderId: "71442389883",
  appId: "1:71442389883:web:7b6e795f26566c2d923bde"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let playerId = null;
let isHost = false;
let currentQuestion = 0;

// Join the lobby
export async function joinLobby() {
  if (playerId) return alert("You’ve already joined the game.");

  const name = document.getElementById("displayName").value.trim();
  if (!name) return alert("Please enter a name");

  // Check if name already exists
  const existing = await getDocs(query(collection(db, "players"), where("name", "==", name)));
  if (!existing.empty) return alert("That name is already taken. Try another.");

  // Check if anyone is already in the lobby
  const playersSnap = await getDocs(collection(db, "players"));
  const isFirstPlayer = playersSnap.empty;

  // Add player to Firestore
  const playerRef = await addDoc(collection(db, "players"), {
    name,
    isHost: isFirstPlayer
  });
  playerId = playerRef.id;

  // Retrieve host status from Firestore (in case of reload or multiple joins)
  const playerDoc = await getDoc(doc(db, "players", playerId));
  isHost = playerDoc.data().isHost;

  // If host, initialize game state and show buttons
  if (isHost) {
  await setDoc(doc(db, "gameState", "main"), { started: false });
  showStartButton();
  showResetButton();
  document.getElementById("resetButton").classList.remove("hidden"); // ✅ Host sees it
} else {
  document.getElementById("waitingMessage").classList.remove("hidden");
}

  

  listenToPlayers();
  listenToGameState();
}

// Show list of players
function listenToPlayers() {
  const playerList = document.getElementById("playerList");
  onSnapshot(collection(db, "players"), (snapshot) => {
    playerList.innerHTML = "";
    snapshot.forEach((doc) => {
      const li = document.createElement("li");
      li.textContent = doc.data().name;
      playerList.appendChild(li);
    });
  });
}

// Show Start Game button
function showStartButton() {
  const btn = document.createElement("button");
  btn.textContent = "Start Game";
  btn.onclick = startGame;
  document.getElementById("lobby").appendChild(btn);
}

// Show Reset Game button
function showResetButton() {
  const btn = document.createElement("button");
  btn.textContent = "Reset Game";
  btn.onclick = resetGame;
  document.getElementById("lobby").appendChild(btn);
}

// Start the game
async function startGame() {
  await updateDoc(doc(db, "gameState", "main"), { started: true });
}

// Reset the game
async function resetGame() {
  const playersSnap = await getDocs(collection(db, "players"));
  playersSnap.forEach((docSnap) => deleteDoc(doc(db, "players", docSnap.id)));

  const responsesSnap = await getDocs(collection(db, "responses"));
  responsesSnap.forEach((docSnap) => deleteDoc(doc(db, "responses", docSnap.id)));

  await setDoc(doc(db, "gameState", "main"), { started: false });

  alert("Game reset. Players can now rejoin.");
  location.reload();
}

// Listen for game start
function listenToGameState() {
  onSnapshot(doc(db, "gameState", "main"), (docSnap) => {
    if (docSnap.exists() && docSnap.data().started) {
      document.getElementById("waitingMessage").classList.add("hidden");
      startCountdown();
    }
  });
}

// Countdown before game starts
function startCountdown() {
  const lobby = document.getElementById("lobby");
  const countdown = document.createElement("h2");
  countdown.id = "countdown";
  lobby.appendChild(countdown);

  let count = 3;
  countdown.textContent = `Game starts in ${count}...`;

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdown.textContent = `Game starts in ${count}...`;
    } else {
      clearInterval(interval);
      countdown.remove();
      lobby.classList.add("hidden");
      document.getElementById("questionScreen").classList.remove("hidden");
      loadQuestion();
    }
  }, 1000);
}

// Load a question
function loadQuestion() {
  const q = questions[currentQuestion];
  document.getElementById("questionText").textContent = q.text;
  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";

  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.onclick = () => submitAnswer(q.id, opt);
    optionsDiv.appendChild(btn);
  });
}

// Submit answer
async function submitAnswer(qid, answer) {
  await setDoc(doc(db, "responses", `${playerId}_${qid}`), {
    playerId,
    questionId: qid,
    answer
  });
}

// Next question or show results
export function nextQuestion() {
  currentQuestion++;
  if (currentQuestion < questions.length) {
    loadQuestion();
  } else {
    showResults();
  }
}

// Show results
async function showResults() {
  document.getElementById("questionScreen").classList.add("hidden");
  document.getElementById("resultsScreen").classList.remove("hidden");

  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  for (const q of questions) {
    const counts = {};
    const resSnap = await getDocs(query(collection(db, "responses"), where("questionId", "==", q.id)));

    resSnap.forEach((doc) => {
      const data = doc.data();
      counts[data.answer] = (counts[data.answer] || 0) + 1;
    });

    const resultText = document.createElement("p");
    resultText.textContent = `${q.text}: ${Object.entries(counts)
      .map(([opt, count]) => `${opt}: ${count}`)
      .join(", ")}`;
    resultsDiv.appendChild(resultText);
  }
}
document.getElementById("joinButton").addEventListener("click", joinLobby);
document.getElementById("resetButton").addEventListener("click", resetGame);
