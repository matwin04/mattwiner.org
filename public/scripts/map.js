var map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
}).addTo(map);
var marker = L.marker([0, 0]).addTo(map);
var myIcon = L.icon({
    iconUrl: 'https://fonts.gstatic.com/s/i/materialicons/location_on/v15/24px.svg',
    iconSize: [32, 32], // Size of the icon
    iconAnchor: [16, 32], // Anchor so it points correctly
    popupAnchor: [0, -32] // Adjust popup position
});
function locateUser() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude;
            var lng = position.coords.longitude;
            
            // Update map view
            map.setView([lat, lng], 15);

            // Add a marker at the user's location
            L.marker([lat, lng], { icon: myIcon })
                .addTo(map)
                .bindPopup("<b>You are here!</b>").openPopup();

        }, function(error) {
            alert("Geolocation failed: " + error.message);
        });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}
map.locate({ setView: true, maxZoom: 16 });
// Call function to get location
locateUser();