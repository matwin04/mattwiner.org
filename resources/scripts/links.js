document.addEventListener("DOMContentLoaded", () => {
    fetch("resources/links.json")
        .then((response) => response.json())
        .then((data) => {
            const linksContainer = document.getElementById("links");
            linksContainer.innerHTML = "";
            data.forEach((link) => {
                const a = document.createElement("a");
                a.href = link.url;
                a.textContent = link.name;
                linksContainer.appendChild(a);
            });
        })
        .catch((error) => console.error("Error Loading Links", error));
});
