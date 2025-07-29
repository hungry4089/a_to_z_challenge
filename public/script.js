// Firebase 초기화 및 인증, Firestore 임포트
const firebaseConfig = {
    apiKey: "AIzaSyB2zgVtWy0JIU-r0Ppu2zG_TqNhXgvFBtY",
    authDomain: "a-z-challenge-51e89.firebaseapp.com",
    projectId: "a-z-challenge-51e89",
    storageBucket: "a-z-challenge-51e89.appspot.com",
    messagingSenderId: "254478132856",
    appId: "1:254478132856:web:c9a1a99ec30737c5fbaf8d",
    measurementId: "G-6W55MRX56Y"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const correct = "abcdefghijklmnopqrstuvwxyz";
let startTime = null;
let timerInterval = null;
let user = null;
let previousLength = 0;

const input = document.getElementById("typingInput");
const timerDisplay = document.getElementById("timer");
const result = document.getElementById("result");
const finalTime = document.getElementById("finalTime");
const recordList = document.getElementById("recordList");
const warningMessage = document.getElementById("warningMessage");

const signInBtn = document.getElementById("googleSignInBtn");
const loginContainer = document.getElementById("loginContainer");
const leaderboardList = document.getElementById("leaderboardList");
const myRankDisplay = document.getElementById("myRankDisplay");
const browserWarning = document.getElementById("browserWarning");

function isKakaoBrowser() {
    return /KAKAOTALK/i.test(navigator.userAgent);
}

function checkKakaoBrowser() {
    if (isKakaoBrowser()) {
        browserWarning.style.display = "block";
        loginContainer.style.display = "none";
    } else {
        browserWarning.style.display = "none";
        loginContainer.style.display = "block";
    }
}

window.addEventListener('DOMContentLoaded', () => {
    checkKakaoBrowser();
});

// 붙여넣기 및 자동완성 방지
input.addEventListener("paste", (e) => {
    e.preventDefault();
    handleInvalidInput();
});

input.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

input.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        handleInvalidInput();
    }
});

// 모바일 롱프레스 방지
input.addEventListener("touchstart", (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
});

input.addEventListener("touchend", (e) => {
    if (input.value.length > 1 && !startTime) {
        e.preventDefault();
        handleInvalidInput();
    }
});

input.setAttribute("autocomplete", "off");

input.addEventListener("click", () => {
    if (input.value === correct) {
        input.value = "";
        resetTimerDisplay();
        input.style.borderColor = "#444";
        warningMessage.style.display = "none";
        previousLength = 0;
    }
});

// ✅ 수정된 입력 유효성 처리 함수
function handleInvalidInput() {
    input.disabled = true;
    setTimeout(() => {
        input.value = "";
        input.style.borderColor = "red";
        warningMessage.style.display = "block";
        resetTimerDisplay();
        previousLength = 0;
        input.disabled = false;
        input.focus();
    }, 0);
}

// 입력 처리
input.addEventListener("input", () => {
    const typed = input.value.toLowerCase();
    const currentLength = typed.length;

    if (currentLength - previousLength > 1) {
        handleInvalidInput();
        return;
    }

    previousLength = currentLength;

    if (typed.length === 0) {
        resetTimerDisplay();
    }

    if (typed === "a" && !startTime) {
        startTime = performance.now();
        timerInterval = setInterval(updateTimerDisplay, 10);
    }

    if (!correct.startsWith(typed)) {
        input.style.borderColor = "red";
    } else {
        input.style.borderColor = "#00ffa0";
        warningMessage.style.display = "none";
    }

    if (typed === correct) {
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        clearInterval(timerInterval);
        timerDisplay.textContent = duration + "s";
        finalTime.textContent = duration;
        result.style.display = "block";
        input.disabled = true;
        saveRecord(duration);
    }
});

function updateTimerDisplay() {
    if (startTime) {
        const now = performance.now();
        const elapsed = ((now - startTime) / 1000).toFixed(2);
        timerDisplay.textContent = elapsed + "s";
    }
}

function resetTimerDisplay() {
    timerDisplay.textContent = "0.00s";
    clearInterval(timerInterval);
    startTime = null;
}

function restart() {
    input.value = "";
    input.disabled = false;
    input.focus();
    resetTimerDisplay();
    result.style.display = "none";
    input.style.borderColor = "#444";
    warningMessage.style.display = "none";
    previousLength = 0;
}

function saveRecord(time) {
    const records = JSON.parse(localStorage.getItem("records") || "[]");
    records.push(parseFloat(time));
    localStorage.setItem("records", JSON.stringify(records));
    renderRecords();
    if (user) {
        uploadBestRecord();
    }
}

function renderRecords() {
    const records = JSON.parse(localStorage.getItem("records") || "[]");
    recordList.innerHTML = "";
    if (records.length === 0) return;
    const best = Math.min(...records);

    records
        .slice()
        .sort((a, b) => a - b)
        .slice(0, 6)
        .forEach((r) => {
            const li = document.createElement("li");
            li.textContent = `${r.toFixed(2)}s`;
            if (r === best) li.classList.add("best");
            recordList.appendChild(li);
        });
}

signInBtn.addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
});

auth.onAuthStateChanged(async (u) => {
    checkKakaoBrowser();
    if (u) {
        user = u;
        loginContainer.style.display = "none";
        await uploadBestRecord();
        await loadLeaderboard();
    } else {
        user = null;
        checkKakaoBrowser();
        leaderboardList.innerHTML = "";
        myRankDisplay.textContent = "";
    }
});

async function uploadBestRecord() {
    const records = JSON.parse(localStorage.getItem("records") || "[]");
    if (records.length === 0) return;
    const best = Math.min(...records);

    const userDoc = db.collection("leaderboard").doc(user.uid);
    const docSnapshot = await userDoc.get();
    if (!docSnapshot.exists || docSnapshot.data().score > best) {
        await userDoc.set({
            name: user.displayName,
            score: best
        });
    }
}

async function loadLeaderboard() {
    const querySnapshot = await db.collection("leaderboard")
        .orderBy("score")
        .limit(10)
        .get();

    const list = [];
    querySnapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));

    leaderboardList.innerHTML = "";
    let myInTop10 = false;

    list.forEach((r, i) => {
        const li = document.createElement("li");
        li.textContent = `${i + 1}. ${maskName(r.name)}: ${r.score.toFixed(2)}s`;
        if (r.id === user?.uid) {
            li.style.fontWeight = "bold";
            li.style.color = "#00ffa0";
            myInTop10 = true;
            myRankDisplay.textContent = `내 순위: ${i + 1}위`;
        }
        leaderboardList.appendChild(li);
    });

    if (!myInTop10) {
        const allScoresSnapshot = await db.collection("leaderboard").orderBy("score").get();
        const allScores = [];
        allScoresSnapshot.forEach(doc => allScores.push({ id: doc.id, score: doc.data().score }));

        const myRecord = Math.min(...(JSON.parse(localStorage.getItem("records") || "[]")));

        let rank = 1;
        for (const r of allScores) {
            if (r.score < myRecord) {
                rank++;
            } else {
                break;
            }
        }
        myRankDisplay.textContent = `내 순위: ${rank}위`;
    }
}

function maskName(name) {
    if (!name || name.length < 2) return "*";
    return "*" + name.slice(1);
}

renderRecords();
