function updateClock() {
    const now = new Date();
    const timeStr = new Date().toLocaleTimeString();
    const hours = String(now.getHours()).padStart(2,'0');
    const minutes = String(now.getMinutes()).padStart(2,'0');
    const seconds = String(now.getSeconds()).padStart(2,'0');
    document.getElementById('clock').innerText = `${hours}:${minutes}:${seconds}`;
}
function updateCalendar() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2,'0');
    const month = String(now.getMonth()+1).padStart(2,'0');
    const year = now.getFullYear();
    document.getElementById('calendar').innerText = `${month}/${day}/${year}`;
}
document.addEventListener("DOMContentLoaded",()=>{
    updateClock();
    updateCalendar();
    setInterval(updateClock,1000);
    setInterval(updateCalendar,60000);
});
