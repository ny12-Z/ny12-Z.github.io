function updateMusicClock() {
const now = new Date();

const hours = String(now.getHours()).padStart(2, "0");
const minutes = String(now.getMinutes()).padStart(2, "0");
const seconds = String(now.getSeconds()).padStart(2, "0");

const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, "0");
const day = String(now.getDate()).padStart(2, "0");

document.getElementById("music-time").textContent =
hours + ":" + minutes + ":" + seconds;

document.getElementById("music-date").textContent =
year + "." + month + "." + day;
}

updateMusicClock();
setInterval(updateMusicClock, 1000);
const audio = document.getElementById("music-audio");
const playButton = document.getElementById("music-play");
const progressBar = document.getElementById("music-progress");
const currentTime = document.getElementById("music-current");
const durationTime = document.getElementById("music-duration");
const volumeBar = document.getElementById("music-volume");

audio.src = "/music/3-10%20-%20Musa.mp3";
audio.volume = 0.7;

function formatTime(seconds) {
const minutes = Math.floor(seconds / 60);
const remainingSeconds = Math.floor(seconds % 60);

return (
String(minutes) +
":" +
String(remainingSeconds).padStart(2, "0")
);
}

playButton.addEventListener("click", function() {
if (audio.paused) {
audio.play();
playButton.textContent = "Ⅱ";
} else {
audio.pause();
playButton.textContent = "▶";
}
});

audio.addEventListener("loadedmetadata", function() {
durationTime.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", function() {
currentTime.textContent = formatTime(audio.currentTime);

if (audio.duration) {
progressBar.value =
(audio.currentTime / audio.duration) * 100;
}
});

progressBar.addEventListener("input", function() {
if (audio.duration) {
audio.currentTime =
(progressBar.value / 100) * audio.duration;
}
});

volumeBar.addEventListener("input", function() {
audio.volume = volumeBar.value;
});

audio.addEventListener("ended", function() {
playButton.textContent = "▶";
progressBar.value = 0;
currentTime.textContent = "0:00";
});