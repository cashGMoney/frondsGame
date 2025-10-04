import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, setDoc, doc, getDoc, updateDoc } from "firebase/firestore";

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
let currentQuestion = 0;

async function joinLobby() {
  const name = document.getElementById("displayName").value;
  const playerRef = await addDoc(collection(db, "players"), { name });
  playerId = playerRef.id;

  document.getElementById("lobby").classList.add("hidden");
  document.getElementById("questionScreen").classList.remove("hidden");

  loadQuestion();
  listenToPlayers();
}

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

async function submitAnswer(qid, answer) {
  await setDoc(doc(db, "responses", `${playerId}_${qid}`), {
    playerId,
    questionId: qid,
    answer
  });
}

function nextQuestion() {
  currentQuestion++;
  if (currentQuestion < questions.length) {
    loadQuestion();
  } else {
    showResults();
  }
}

async function showResults() {
  document.getElementById("questionScreen").classList.add("hidden");
  document.getElementById("resultsScreen").classList.remove("hidden");

  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  for (const q of questions) {
    const snapshot = await getDoc(doc(db, "responses", `${playerId}_${q.id}`));
    const counts = {};

    const resSnap = await onSnapshot(collection(db, "responses"), (snap) => {
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.questionId === q.id) {
          counts[data.answer] = (counts[data.answer] || 0) + 1;
        }
      });

      const resultText = document.createElement("p");
      resultText.textContent = `${q.text}: ${Object.entries(counts).map(([opt, count]) => `${opt}: ${count}`).join(", ")}`;
      resultsDiv.appendChild(resultText);
    });
  }
}
