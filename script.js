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
let lastValidIndex = -1; // 마지막 유효한 인덱스를 추적

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

// 카카오톡 내장 브라우저 감지 함수
function isKakaoBrowser() {
    return /KAKAOTALK/i.test(navigator.userAgent);
}

// 카카오톡 내장 브라우저일 경우 경고창 표시 및 로그인 버튼 숨기기
function checkKakaoBrowser() {
    if (isKakaoBrowser()) {
        browserWarning.style.display = "block";
        loginContainer.style.display = "none";
    } else {
        browserWarning.style.display = "none";
        loginContainer.style.display = "block";
    }
}

// DOM 로드 후 실행
window.addEventListener('DOMContentLoaded', () => {
    checkKakaoBrowser();
});

// 붙여넣기 및 자동완성 방지 강화
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

// 모바일 긴 탭(롱프레스) 방지
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

// 클릭 시 입력값 초기화
input.addEventListener("click", () => {
    if (input.value === correct) {
        input.value = "";
        resetTimerDisplay();
        input.style.borderColor = "#444";
        warningMessage.style.display = "none";
        lastValidIndex = -1; // 상태 초기화
    }
});

// 한 번에 입력 감지 및 취소
function handleInvalidInput() {
    input.value = "";
    input.style.borderColor = "red";
    warningMessage.style.display = "block";
    resetTimerDisplay();
    lastValidIndex = -1; // 상태 초기화
}

// 입력 감지
input.addEventListener("input", () => {
    const typed = input.value.toLowerCase();

    // 한 번에 여러 글자 입력 감지 (비순차적 입력)
    if (typed.length > 1 && !startTime && typed !== correct.substring(0, typed.length)) {
        handleInvalidInput();
        return;
    }

    // 순차적 입력 검증
    if (typed.length > 0) {
        const lastChar = typed[typed.length - 1];
        const expectedChar = correct[typed.length - 1];
        if (lastChar !== expectedChar || typed.length - 1 > lastValidIndex + 1) {
            handleInvalidInput();
            return;
        }
        lastValidIndex = typed.length - 1; // 유효한 인덱스 업데이트
    }

    if (typed.length === 0) {
        resetTimerDisplay();
        lastValidIndex = -1;
    }
    if (typed === "a" && !startTime) {
        startTime = performance.now();
        timerInterval = setInterval(updateTimerDisplay, 10);
    }

    if (!correct.startsWith(typed)) {
        input.style.borderColor = "red";
    } else {
        input.style.borderColor = "#00ffa0";
        warningMessage.style.display = "none"; // 올바른 입력 시 경고 숨김
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
    lastValidIndex = -1; // 상태 초기화
}

function restart() {
    input.value = "";
    input.disabled = false;
    input.focus();
    resetTimerDisplay();
    result.style.display = "none";
    input.style.borderColor = "#444";
    warningMessage.style.display = "none";
}

// 로컬 기록 저장
function saveRecord(time) {
    const records = JSON.parse(localStorage.getItem("records") || "[]");
    records.push(parseFloat(time));
    localStorage.setItem("records", JSON.stringify(records));
    renderRecords();

    if (user) {
        uploadBestRecord();
    }
}

// 로컬 기록 렌더링 (최대 6개만 표시)
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

// Google 로그인 처리
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

// Firestore에 사용자 최고 기록 저장
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

// 전체 랭킹 로딩 및 표시
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
        if (r.id === user.uid) {
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

// 닉네임 마스킹 (첫 글자 *로)
function maskName(name) {
    if (!name || name.length < 2) return "*";
    return "*" + name.slice(1);
}

renderRecords(); // 시작 시 로컬 기록 렌더링