async function getLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }),
                (error) => reject(error)
            );
        } else {
            reject("Geolocation not supported");
        }
    });
}

async function getWeather(lat, lon) {
    try {
        const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Client weather fetch error:", error);
    }
}

async function updateWeatherCard() {
    try {
        const { latitude, longitude } = await getLocation();
        const weatherData = await getWeather(latitude, longitude);
        const values = weatherData?.data?.values;
        values.temperature = undefined;

        if (!values) {
            document.getElementById("weather").textContent = "Weather unavailable";
            return;
        }

        const html = `
            <p><strong>Temperature:</strong> ${values.temperature}°C</p>
            <p><strong>Condition Code:</strong> ${values.weatherCode}</p>
            <p><strong>Humidity:</strong> ${values.humidity}%</p>
            <p><strong>Wind:</strong> ${values.windSpeed} km/h</p>
        `;

        document.getElementById("weather").innerHTML = html;
    } catch (err) {
        console.error(err);
        document.getElementById("weather").textContent = "Could not load weather";
    }
}

document.addEventListener("DOMContentLoaded", updateWeatherCard);