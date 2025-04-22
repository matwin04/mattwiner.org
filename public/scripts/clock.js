function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById("clock").textContent = timeString;
}
function updateDate() {
    const date = new Date();
    const month = date.getMonth() + 1;
    let day = date.getDate();
    document.getElementById("date").textContent = `${month}/${day}/${date.getFullYear()}`;
}
document.addEventListener("DOMContentLoaded", updateDate);
document.addEventListener("DOMContentLoaded", updateClock);
setInterval(updateClock, 1000);

