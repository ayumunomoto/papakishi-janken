// パパ吉じゃんけん ゲームロジック

const HANDS = ['goo', 'choki', 'par'];

const HAND_LABEL = {
    goo: 'グー',
    choki: 'チョキ',
    par: 'パー'
};

// パパ吉が出す手の動画
const HAND_VIDEO = {
    goo: 'グー_compressed.mp4',
    choki: 'チョキ_compressed.mp4',
    par: 'パー_compressed.mp4'
};

// 結果動画（あいこ動画が用意されたら draw に追加すれば自動的に使われる）
const RESULT_VIDEO = {
    win: '君の勝ち_compressed.mp4',
    lose: '君の負け_compressed.mp4',
    draw: 'あいこ_compressed.mp4'
};

const RESULT_LABEL = {
    win: 'あなたの勝ち！',
    lose: 'あなたの負け…',
    draw: 'あいこ'
};

const HISTORY_KEY = 'papakichiJankenHistory';
const HISTORY_MAX = 100;

const video = document.getElementById('papakichi-video');
const drawOverlay = document.getElementById('draw-overlay');
const statusLine = document.getElementById('status-line');
const jankenButtons = document.querySelectorAll('.janken-btn');
const againBtn = document.getElementById('again-btn');
const historyBody = document.getElementById('history-body');
const historyEmpty = document.getElementById('history-empty');
const clearHistoryBtn = document.getElementById('clear-history-btn');

let awaitingDrawFallback = false;

function judge(playerHand, papaHand) {
    if (playerHand === papaHand) return 'draw';
    const playerWins =
        (playerHand === 'goo' && papaHand === 'choki') ||
        (playerHand === 'choki' && papaHand === 'par') ||
        (playerHand === 'par' && papaHand === 'goo');
    return playerWins ? 'win' : 'lose';
}

function setButtonsDisabled(disabled) {
    jankenButtons.forEach(btn => { btn.disabled = disabled; });
}

function playVideo(src) {
    video.src = encodeURI(src);
    const p = video.play();
    if (p && p.catch) {
        p.catch(() => {
            // 自動再生がブロックされた場合は、ミュートして再試行
            video.muted = true;
            video.play().catch(() => {});
        });
    }
}

function playerSelect(playerHand) {
    setButtonsDisabled(true);
    drawOverlay.style.display = 'none';
    statusLine.textContent = '';

    const papaHand = HANDS[Math.floor(Math.random() * HANDS.length)];

    video.dataset.phase = 'hand';
    video.dataset.playerHand = playerHand;
    video.dataset.papaHand = papaHand;

    statusLine.textContent = `パパ吉が手を出しています…`;
    playVideo(HAND_VIDEO[papaHand]);
}

video.addEventListener('ended', function () {
    if (video.dataset.phase === 'hand') {
        const playerHand = video.dataset.playerHand;
        const papaHand = video.dataset.papaHand;
        const result = judge(playerHand, papaHand);
        video.dataset.phase = 'result';
        video.dataset.result = result;

        statusLine.textContent =
            `あなた: ${HAND_LABEL[playerHand]} / パパ吉: ${HAND_LABEL[papaHand]}`;

        awaitingDrawFallback = (result === 'draw');
        playVideo(RESULT_VIDEO[result]);
    } else if (video.dataset.phase === 'result') {
        finishRound();
    }
});

// あいこ動画が存在しない場合はテキスト演出にフォールバック
video.addEventListener('error', function () {
    if (video.dataset.phase === 'result' && awaitingDrawFallback) {
        awaitingDrawFallback = false;
        showDrawFallback();
    }
});

function showDrawFallback() {
    drawOverlay.textContent = 'あいこでしょ！';
    drawOverlay.style.display = 'flex';
    setTimeout(finishRound, 1800);
}

function finishRound() {
    const playerHand = video.dataset.playerHand;
    const papaHand = video.dataset.papaHand;
    const result = video.dataset.result;

    statusLine.textContent =
        `あなた: ${HAND_LABEL[playerHand]} / パパ吉: ${HAND_LABEL[papaHand]} → ${RESULT_LABEL[result]}`;

    recordResult(playerHand, papaHand, result);
    againBtn.style.display = 'inline-block';
}

againBtn.addEventListener('click', function () {
    againBtn.style.display = 'none';
    drawOverlay.style.display = 'none';
    statusLine.textContent = '手を選んでね';
    setButtonsDisabled(false);
});

jankenButtons.forEach(btn => {
    btn.addEventListener('click', () => playerSelect(btn.dataset.hand));
});

// --- 履歴（日付時分秒付き）---

function formatTimestamp(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
        + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function recordResult(playerHand, papaHand, result) {
    const history = loadHistory();
    history.unshift({
        datetime: formatTimestamp(new Date()),
        player: HAND_LABEL[playerHand],
        papa: HAND_LABEL[papaHand],
        result
    });
    if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
    saveHistory(history);
    renderHistory(history);
}

function renderHistory(history) {
    historyBody.innerHTML = '';
    historyEmpty.style.display = history.length ? 'none' : 'block';

    history.forEach(entry => {
        const tr = document.createElement('tr');

        const tdTime = document.createElement('td');
        tdTime.textContent = entry.datetime;

        const tdPlayer = document.createElement('td');
        tdPlayer.textContent = entry.player;

        const tdPapa = document.createElement('td');
        tdPapa.textContent = entry.papa;

        const tdResult = document.createElement('td');
        tdResult.textContent = RESULT_LABEL[entry.result];
        tdResult.className = `result-${entry.result}`;

        tr.append(tdTime, tdPlayer, tdPapa, tdResult);
        historyBody.appendChild(tr);
    });
}

clearHistoryBtn.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm('じゃんけんの履歴をすべて削除しますか？')) {
        saveHistory([]);
        renderHistory([]);
    }
});

// 初期表示
renderHistory(loadHistory());
statusLine.textContent = '手を選んでね';
