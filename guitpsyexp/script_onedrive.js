window.addEventListener("load", function() {
const overlay = document.getElementById("overlay");
const closeButton = document.getElementById("close-button");
const exitButton = document.getElementById("exit-button");

closeButton.addEventListener("click", function() {
    overlay.style.display = "none";
});
exitButton.addEventListener("click", function() {
    document.body.innerHTML = "<p> Merci de votre intérêt pour le projet, vous pouvez maintenant quitter la page.</p>";
});


});

document.addEventListener("DOMContentLoaded", function () {


const gitHubPrefix = "https://raw.githubusercontent.com/olivecha/guitpsyexp/main/";

// --- Audio files (same as before) ---
const audioFilesChordsDf1 = [
    "sample_sounds2/chords/cho_df010_af075.wav",
    "sample_sounds2/chords/cho_df010_af100.wav",
    "sample_sounds2/chords/cho_df010_af150.wav",
];
const audioFilesChordsDf2 = [
    "sample_sounds2/chords/cho_df050_af100.wav",
    "sample_sounds2/chords/cho_df050_af150.wav",
    "sample_sounds2/chords/cho_df050_af075.wav",
];
const audioFilesChordsDf3 = [
    "sample_sounds2/chords/cho_df080_af150.wav",
    "sample_sounds2/chords/cho_df080_af075.wav",
    "sample_sounds2/chords/cho_df080_af100.wav",
];
const audioFilesChordsDf4 = [
    "sample_sounds2/chords/cho_df100_af100.wav",
    "sample_sounds2/chords/cho_df100_af050.wav",
    "sample_sounds2/chords/cho_df100_af125.wav",
    "sample_sounds2/chords/cho_df100_af075.wav",
    "sample_sounds2/chords/cho_df100_af150.wav",
    "sample_sounds2/chords/cho_df100_af085.wav",
    "sample_sounds2/chords/cho_df100_af200.wav",
];
const audioFilesChordsAf1 = [
    "sample_sounds2/chords/cho_df100_af075.wav",
    "sample_sounds2/chords/cho_df080_af075.wav",
    "sample_sounds2/chords/cho_df050_af075.wav",
    "sample_sounds2/chords/cho_df010_af075.wav",
];
const audioFilesChordsAf2 = [
    "sample_sounds2/chords/cho_df100_af100.wav",
    "sample_sounds2/chords/cho_df080_af100.wav",
    "sample_sounds2/chords/cho_df050_af100.wav",
    "sample_sounds2/chords/cho_df010_af100.wav",
];
const audioFilesChordsAf3 = [
    "sample_sounds2/chords/cho_df100_af150.wav",
    "sample_sounds2/chords/cho_df080_af150.wav",
    "sample_sounds2/chords/cho_df050_af150.wav",
    "sample_sounds2/chords/cho_df010_af150.wav",
];

const audioFilesMelodiesAf1 = [
    "sample_sounds2/melody/mel_df050_af075.wav",
    "sample_sounds2/melody/mel_df080_af075.wav",
    "sample_sounds2/melody/mel_df100_af075.wav",
];
const audioFilesMelodiesAf2 = [
    "sample_sounds2/melody/mel_df010_af100.wav",
    "sample_sounds2/melody/mel_df050_af100.wav",
    "sample_sounds2/melody/mel_df080_af100.wav",
    "sample_sounds2/melody/mel_df100_af100.wav",
];
const audioFilesMelodiesAf3 = [
    "sample_sounds2/melody/mel_df010_af150.wav",
    "sample_sounds2/melody/mel_df050_af150.wav",
    "sample_sounds2/melody/mel_df080_af150.wav",
    "sample_sounds2/melody/mel_df100_af150.wav",
];

const audioFilesMelodiesDf1 = [
    "sample_sounds2/melody/mel_df010_af075.wav",
    "sample_sounds2/melody/mel_df010_af100.wav",
    "sample_sounds2/melody/mel_df010_af150.wav",
];
const audioFilesMelodiesDf2 = [
    "sample_sounds2/melody/mel_df050_af075.wav",
    "sample_sounds2/melody/mel_df050_af100.wav",
    "sample_sounds2/melody/mel_df050_af150.wav",
];
const audioFilesMelodiesDf3 = [
    "sample_sounds2/melody/mel_df080_af150.wav",
    "sample_sounds2/melody/mel_df080_af075.wav",
    "sample_sounds2/melody/mel_df080_af100.wav",
];
const audioFilesMelodiesDf4 = [
    "sample_sounds2/melody/mel_df100_af100.wav",
    "sample_sounds2/melody/mel_df100_af050.wav",
    "sample_sounds2/melody/mel_df100_af125.wav",
    "sample_sounds2/melody/mel_df100_af075.wav",
    "sample_sounds2/melody/mel_df100_af150.wav",
    "sample_sounds2/melody/mel_df100_af085.wav",
    "sample_sounds2/melody/mel_df100_af200.wav",
];

const audioFilesMelodiesFixedAttack = [audioFilesMelodiesAf1, audioFilesMelodiesAf2, audioFilesMelodiesAf3];
const audioFilesMelodiesFixedDecay = [audioFilesMelodiesDf1, audioFilesMelodiesDf2, audioFilesMelodiesDf3, audioFilesMelodiesDf4];
const audioFilesMelodies = [audioFilesMelodiesFixedAttack, audioFilesMelodiesFixedDecay];

const audioFilesChordsFixedAttack = [audioFilesChordsAf1, audioFilesChordsAf2, audioFilesChordsAf3];
const audioFilesChordsFixedDecay = [audioFilesChordsDf1, audioFilesChordsDf2, audioFilesChordsDf3, audioFilesChordsDf4];
const audioFilesChords = [audioFilesChordsFixedAttack, audioFilesChordsFixedDecay];

const audioFiles = [audioFilesChords, audioFilesMelodies];

// --- Form labels ---
const formLabelsLevel = [
    "Préfère ne pas répondre",
    "Aucune compétence musicale, n'a jamais joué d'un instrument",
    "Débutant, a déjà joué d'un instrument, amateur de musique",
    "Intermédiaire, joue couramment d'un instrument, audiophile",
    "Professionnel, a étudié formellement la musique ou est payé pour jouer",
];
const formLabelsListen = [
    "Préfère ne pas répondre",
    "Écouteurs",
    "Appareil mobile",
    "Haut parleurs d'ordinateur portable",
    "Haut parleurs auxiliaires",
];

const containerA = document.getElementById("SoundAContainer");
const containerB = document.getElementById("SoundBContainer");
const containerMessage = document.getElementById("messageContainer");
const containerSoundLoadInfo = document.getElementById("soundLoadMessage");
const button = document.getElementById("choice-save");
//const delButton = document.getElementById("choice-del");
const endSessionButton = document.getElementById("end-session");
const soundALabel = document.getElementById("soundALabel");
const soundBLabel = document.getElementById("soundBLabel");
const labelColors = ["#691100","#696500","#286900","#006948","#004D69","#0E0069","#640069"];
let colorId = 0;

const buttonUserInfo = document.createElement("button");
buttonUserInfo.textContent = "Enregistrer pour la session";

const userInfoContainer = document.getElementById("userInfoForm");
const buttonUserInfoRestart = document.createElement("button");
buttonUserInfoRestart.textContent = "Nouvel utilisateur";
buttonUserInfo.addEventListener("click", saveUserInfoAndHideQuestions);

let fractionPlayedTimeA = 0.0;
let fractionPlayedTimeB = 0.0;
let UserInfoChoiceVisible = false;

const powerAutomateUrl = "https://default253209e9773140eb96e16444a68232.37.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/86d1df9c3eca4334a84938011fd6b6d1/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=je6rIwsvs-vZKlI7-smOirfcw9tSFyWqRW26DhmgbsA";
const powerAutomateUrlBruant = "https://default92a7730074664fef89c3269c03d87d.b8.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/07ee26ea0f524bd28fd1afb628f7ae2c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=kySYL9mIoj1wWv9Dej2_nysmmofIhDzaEiGiWCuAPbk";

function sanitize(value, fallback = null) {
    if (value === undefined) return fallback;
    if (typeof value === "number" && !Number.isFinite(value)) return fallback;
    return value;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



let powerAutomateQueue = Promise.resolve();

async function sendDataToPowerAutomate(
    userId,
    userMusicLevel,
    userListenMode,
    soundInfoA,
    soundInfoB,
    fracA,
    fracB,
    soundChoice,
    deleted = false
) {
    // Queue requests so they NEVER overlap
    powerAutomateQueue = powerAutomateQueue.then(() =>
        sendDataInternal(
            userId,
            userMusicLevel,
            userListenMode,
            soundInfoA,
            soundInfoB,
            fracA,
            fracB,
            soundChoice,
            deleted
        )
    );

    return powerAutomateQueue;
}

async function sendDataInternal(
    userId,
    userMusicLevel,
    userListenMode,
    soundInfoA,
    soundInfoB,
    fracA,
    fracB,
    soundChoice,
    deleted
) {
    const payload = {
        timestamp: new Date().toISOString(),
        userId: sanitize(userId),
        userMusicLevel: sanitize(Number(userMusicLevel)),
        userListenMode: sanitize(Number(userListenMode)),
        soundType: sanitize(soundInfoA?.[0]),
        decayFactorA: sanitize(soundInfoA?.[1]),
        decayFactorB: sanitize(soundInfoB?.[1]),
        attackFactorA: sanitize(soundInfoA?.[2]),
        attackFactorB: sanitize(soundInfoB?.[2]),
        playedFractionA: sanitize(fracA),
        playedFractionB: sanitize(fracB),
        soundChoice: sanitize(soundChoice),
        deleted: !!deleted
    };

    console.log("Payload being sent:", JSON.stringify(payload));

    // Small delay to reduce Excel / connector contention
    await delay(400);

    await postWithRetry(payload, 2);
    console.log("Data successfully sent to Power Automate (Poly):", payload);

    await postWithRetryBruant(payload, 2);
    console.log("Data successfully sent to Power Automate (Bruant):", payload);

}

async function postWithRetry(payload, retries) {
    try {
        const response = await fetch(powerAutomateUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }
    } catch (err) {
        if (retries > 0) {
            console.warn("Retrying Power Automate POST...", err.message);
            await delay(700);
            return postWithRetry(payload, retries - 1);
        }
        console.error("Final failure sending data:", err);
        throw err;
    }
}

async function postWithRetryBruant(payload, retries) {
    try {
        const response = await fetch(powerAutomateUrlBruant, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }
    } catch (err) {
        if (retries > 0) {
            console.warn("Retrying Power Automate POST...", err.message);
            await delay(700);
            return postWithRetryBruant(payload, retries - 1);
        }
        console.error("Final failure sending data:", err);
        throw err;
    }
}


function soundParamFromFile(file) {
    let baseName = file.split('/').pop().split('.')[0];
    let soundInfo = baseName.split('_');
    let soundTypeKey = soundInfo[0];
    let soundType = soundTypeKey === "mel" ? "melody" : "chord";
    let decayFactor = soundInfo[1][2] + '.' + soundInfo[1].slice(3,5);
    let attackFactor = soundInfo[2][2] + '.' + soundInfo[2].slice(3,5);
    return [soundType, Number(decayFactor), Number(attackFactor)];
}

function loadRandomAudio(btn, firstRun=false) {
    containerMessage.innerHTML = "";
    if (!firstRun && (userMusicLevel === "-1" || userListenMode === "-1")) {
        containerMessage.innerHTML = "Veuillez d'abord répondre au questionnaire ci-haut";
        return;
    }

    containerA.innerHTML = "";
    containerB.innerHTML = "";

    const typeChoice = Math.floor(Math.random() * 2);
    const paramChoice = Math.floor(Math.random() * 2);
    const paramFiles = audioFiles[typeChoice][paramChoice];
    const paramValChoice = Math.floor(Math.random() * paramFiles.length);
    const audioFilesCurrent = paramFiles[paramValChoice];

    const randomIndexA = Math.floor(Math.random() * audioFilesCurrent.length);
    const randomIndexB = Math.floor(Math.random() * audioFilesCurrent.length);
    const randomFileA = audioFilesCurrent[randomIndexA];
    const randomFileB = audioFilesCurrent[randomIndexB];

    const audioElementA = document.createElement("audio");
    audioElementA.controls = true;
    audioElementA.src = gitHubPrefix + randomFileA;

    const audioElementB = document.createElement("audio");
    audioElementB.controls = true;
    audioElementB.src = gitHubPrefix + randomFileB;

    soundALabel.style.color = labelColors[colorId];
    soundBLabel.style.color = labelColors[colorId];
    colorId = (colorId + 1) % labelColors.length;

    containerA.appendChild(audioElementA);
    containerB.appendChild(audioElementB);

    audioElementA.addEventListener('pause', () => {
        fractionPlayedTimeA = Math.max(audioElementA.currentTime/audioElementA.duration, fractionPlayedTimeA);
    });
    audioElementB.addEventListener('pause', () => {
        fractionPlayedTimeB = Math.max(audioElementB.currentTime/audioElementB.duration, fractionPlayedTimeB);
    });

    let el = document.querySelector('input[name="sound-choice"]:checked');
    if (el && !firstRun) {
        let soundChoice = el.value;
        let soundInfoA = soundParamFromFile(randomFileA);
        let soundInfoB = soundParamFromFile(randomFileB);

        sendDataToPowerAutomate(userId, userMusicLevel, userListenMode,
                                soundInfoA, soundInfoB,
                                fractionPlayedTimeA, fractionPlayedTimeB,
                                soundChoice);

        fractionPlayedTimeA = 0.0;
        fractionPlayedTimeB = 0.0;

        choiceCounter += 1;
        if (choiceCounter < 5) {
            containerMessage.innerHTML = "Vous avez évalué " + choiceCounter + " sons sur 5";
        } else if (choiceCounter == 5) {
            containerMessage.innerHTML = "Vous avez évalué le nombre minimal de sons, merci pour votre contribution. Vous pouvez continuer à évaluer des sons!";
        }

        containerSoundLoadInfo.innerHTML = "Choix enregistré! De nouveaux sons ont été générés";
        setTimeout(() => { containerSoundLoadInfo.innerHTML = ""; }, 2000);
    } else if (!firstRun) {
        containerMessage.innerHTML += "Veuillez choisir un son";
    }

    document.getElementById('SonA').checked = false;
    document.getElementById('SonB').checked = false;
}

function saveUserInfoAndHideQuestions() {
    userMusicLevel = document.querySelector('input[name="music_skills"]:checked').value;
    userListenMode = document.querySelector('input[name="listen_mode"]:checked').value;
    userInfoForm.innerHTML = "";
    const rowContainer = document.createElement("div");
    rowContainer.className = "row2";
    rowContainer.appendChild(buttonUserInfoRestart);
    userInfoContainer.appendChild(rowContainer);
    UserInfoChoiceVisible = false;
}

function restoreUserInfoForm() {
    if (UserInfoChoiceVisible) return;

    const rowContainer1 = document.createElement("div");
    rowContainer1.className = "row2";
    const title1 = document.createElement("p");
    title1.innerHTML = "<b> Compétence musicale </b>";
    rowContainer1.appendChild(title1);

    for (let i = 0; i < 5; i++) {
        const levelInput = document.createElement("input");
        levelInput.type="radio";
        levelInput.id = "level" + i;
        levelInput.name = "music_skills";
        levelInput.value = i.toString();
        rowContainer1.appendChild(levelInput);
        const levelInputLabel = document.createElement('label');
        levelInputLabel.textContent = formLabelsLevel[i];
        rowContainer1.appendChild(levelInputLabel);
        rowContainer1.appendChild(document.createElement('br'));
    }
    userInfoContainer.appendChild(rowContainer1);

    const rowContainer2 = document.createElement("div");
    rowContainer2.className = "row2";
    const title2 = document.createElement("p");
    title2.innerHTML = "<b> Méthode d'écoute </b>";
    rowContainer2.appendChild(title2);

    for (let i = 0; i < 5; i++) {
        const levelInput = document.createElement("input");
        levelInput.type="radio";
        levelInput.id = "listen" + i;
        levelInput.name = "listen_mode";
        levelInput.value = i.toString();
        rowContainer2.appendChild(levelInput);
        const levelInputLabel = document.createElement('label');
        levelInputLabel.textContent = formLabelsListen[i];
        rowContainer2.appendChild(levelInputLabel);
        rowContainer2.appendChild(document.createElement('br'));
    }
    userInfoContainer.appendChild(rowContainer2);

    const rowContainer3 = document.createElement("div");
    rowContainer3.className = "row2";
    rowContainer3.appendChild(buttonUserInfo);
    userInfoContainer.appendChild(rowContainer3);

    UserInfoChoiceVisible = true;
}

function removeUserChoices() {
    restoreUserInfoForm();
    loadRandomAudio(button, true);
}

function endSession() {
    restoreUserInfoForm();
    loadRandomAudio(button, true);
}

restoreUserInfoForm();
if (typeof userMusicLevel === "undefined") userMusicLevel = "-1";
if (typeof userListenMode === "undefined") userListenMode = "-1";
if (typeof choiceCounter === "undefined") choiceCounter = 0;

if (typeof userId === "undefined") {
// Generate a random 12-digit number as anonymized user ID
userId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
}

loadRandomAudio(button, true);

button.addEventListener("click", loadRandomAudio);
//delButton.addEventListener("click", removeUserChoices);
endSessionButton.addEventListener("click", endSession);
buttonUserInfo.addEventListener("click", saveUserInfoAndHideQuestions);
buttonUserInfoRestart.addEventListener("click", restoreUserInfoForm);


});

