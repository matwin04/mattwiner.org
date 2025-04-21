async function fetchWeather(lat, lon) {
    const params = {
        latitude: lat,
        longitude: lon,
        hourly: "temperature_2m,precipitation_probability,weather_code",
        current: "temperature_2m,is_day",
        timezone: "America/Los_Angeles",
        past_days: "1",
        wind_speed_unit: "mph",
        temperature_unit: "fahrenheit",
        precipitation_unit: "inch"
    };
    // Convert Paramas to URL SEARCH PARAMS
    const queryString = new URLSearchParams(params).toString();
    const url = `https://api.open-meteo.com/v1/forecast?${queryString}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        //Current Temp
        const currentTemp = data.current?.temperature_2m;
        const isDay = data.current?.is_day;

        document.getElementById("weather-output").innerText =
            `Current Temp: ${currentTemp}°F | Daytime: ${isDay ? "Yes" : "No"}`;

        const hours = data.hourly.time;
        const temps = data.hourly.temperature_2m;
        const now = new Date();
        const currentHour = now.getHours();

        const tbody = document.getElementById("forecast-body");
        tbody.innerHTML = "";

        for (let i = 0; i < hours.length; i++) {
            const hourDate = new Date(hours[i]);
            if (hourDate.getDate() === now.getDate() && hourDate.getHours() >= currentHour) {
                const hourStr = hourDate.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit"
                });
                const tempStr = `${Math.round(temps[i])}°F`;
                const row = document.createElement("tr");
                if (tbody.children.length===0) {
                    row.id = "current-hour";
                }
                const th = document.createElement("th");
                const td = document.createElement("td");
                th.textContent = hourStr;
                td.textContent = tempStr;
                row.appendChild(th);
                row.appendChild(td);
                tbody.appendChild(row);
                if (tbody.children.length >= 10) break; // Only next 5 hours
            }
        }
    } catch (err) {
        document.getElementById("weather-output").innerText = "Error fetching weather.";
        console.error(err);
    }
}
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            fetchWeather(lat, lon);
        },
        (error) => {
            document.getElementById("weather-output").innerText = "GEOLOCATION ERROR";
        }
    );
} else {
    document.getElementById("weather-output").innerText = "Not Supported";
}
