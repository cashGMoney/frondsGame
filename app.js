import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where
} from "firebase/firestore";

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
async function joinLobby() {
  const name = document.getElementById("displayName").value;
  if (!name) return alert("Please enter a name");

  const playersSnap = await getDocs(collection(db, "players"));
  isHost = playersSnap.empty;

  const playerRef = await addDoc(collection(db, "players"), {
    name,
    isHost
  });
  playerId = playerRef.id;

  if (isHost) {
    await setDoc(doc(db, "gameState", "main"), { started: false });
  }
  if (!isHost) {
  document.getElementById("waitingMessage").classList.remove("hidden");
}

  listenToPlayers();
  listenToGameState();

  document.getElementById("lobby").classList.remove("hidden");
  document.getElementById("questionScreen").classList.add("hidden");
  document.getElementById("resultsScreen").classList.add("hidden");

  if (isHost) showStartButton();
}

// Show list of players in lobby
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

// Show Start Game button for host
function showStartButton() {
  const btn = document.createElement("button");
  btn.textContent = "Start Game";
  btn.onclick = startGame;
  document.getElementById("lobby").appendChild(btn);
}

// Host starts the game
async function startGame() {
  await updateDoc(doc(db, "gameState", "main"), { started: true });
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


// Load current question
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

// Submit answer to Firestore
async function submitAnswer(qid, answer) {
  await setDoc(doc(db, "responses", `${playerId}_${qid}`), {
    playerId,
    questionId: qid,
    answer
  });
}

// Go to next question or show results
function nextQuestion() {
  currentQuestion++;
  if (currentQuestion < questions.length) {
    loadQuestion();
  } else {
    showResults();
  }
}

// Show aggregated results
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
