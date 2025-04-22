// Get Material Icon name from Open-Meteo weather code
function getWeatherIcon(code) {
    if ([0].includes(code)) return "wb_sunny"; // Clear
    if ([1, 2, 3].includes(code)) return "cloudy"; // Partly Cloudy
    if ([45, 48].includes(code)) return "foggy"; // Fog
    if ([51, 53, 55, 61, 63, 65].includes(code)) return "rainy"; // Rain
    if ([66, 67, 71, 73, 75, 77, 85, 86].includes(code)) return "ac_unit"; // Snow/Ice
    if ([95, 96, 99].includes(code)) return "thunderstorm"; // Thunderstorm
    return "help"; // Unknown
}

// Fetch weather data from Open-Meteo API

async function fetchDailyWeather(lat, lon) {
    const params = {
        latitude: lat,
        longitude: lon,
        daily: "sunrise,sunset,temperature_2m_max,temperature_2m_min",
        temperature_unit: "fahrenheit",
        timezone: "America/Los_Angeles"
    };

    const queryString = new URLSearchParams(params).toString();
    const url = `https://api.open-meteo.com/v1/forecast?${queryString}`;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            }
        });

        const data = await response.json();
        const daily = data.daily;
        const tbody = document.getElementById("daily-weather-body");
        tbody.innerHTML = ""; // Clear previous data

        for (let i = 0; i < daily.time.length && i < 12; i++) {
            const date = new Date(daily.time[i]).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric"
            });
            const sunrise = new Date(daily.sunrise[i]).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
            });
            const sunset = new Date(daily.sunset[i]).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
            });
            const tempMax = daily.temperature_2m_max[i];
            const tempMin = daily.temperature_2m_min[i];

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${date}</td>
                <td>${sunrise}</td>
                <td>${sunset}</td>
                <td>${tempMax}°F</td>
                <td>${tempMin}°F</td>
            `;
            tbody.appendChild(row);
        }
    } catch (err) {
        console.error("Error fetching daily weather:", err);
        document.getElementById("daily-weather-body").innerHTML =
            `<tr><td colspan="5">Unable to fetch daily weather.</td></tr>`;
    }
}
async function fetchHourlyWeather(lat, lon) {
    const params = {
        latitude: lat,
        longitude: lon,
        hourly: "temperature_2m,precipitation_probability,weather_code,relative_humidity_2m,dew_point_2m",
        temperature_unit: "fahrenheit",
        timezone: "America/Los_Angeles"
    };
    const queryString = new URLSearchParams(params).toString();
    const url = `https://api.open-meteo.com/v1/forecast?${queryString}`;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            }
        });


        const data = await response.json();
        const hourly = data.hourly;


        const now = new Date();
        const currentHour = now.getHours();

        const tbody = document.getElementById("hourly-weather-body");
        tbody.innerHTML = "";
        for (let i = 0; i < hourly.time.length; i++) {
            const hourDate = new Date(hourly.time[i]);
            if (hourDate.getDate() === now.getDate() && hourDate.getHours() >= currentHour) {
                const timeStr = hourDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                const temp = Math.round(hourly.temperature_2m[i]);
                const precip = hourly.precipitation_probability[i];
                const humidity = hourly.relative_humidity_2m[i];
                const dewPoint = hourly.dew_point_2m?.[i] ?? "N/A";
                const weatherCode = hourly.weather_code[i];
                const icon = getWeatherIcon(weatherCode);
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${timeStr}</td>
                    <td>${temp}°F</td>
                    <td>${precip}%</td>
                    <td>${humidity}%</td>
                    
                    <td><span class="material-icons">${icon}</span></td>
                `;
                tbody.appendChild(row);
                if (tbody.children.length >= 10) break; // Limit to next 10 hours
            }
        }
    } catch (err) {
        console.error("Error fetching hourly weather.");
    }
}
// Wrap navigator.geolocation logic
function getUserLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                callback(lat, lon); // Call your function with coords
            },
            (error) => {
                console.error("Geolocation error:", error);
                document.getElementById("weather-output").textContent = "Geolocation failed.";
            }
        );
    } else {
        document.getElementById("weather-output").textContent = "Geolocation not supported.";
    }
}

getUserLocation((lat, lon) => {
 // your hourly + chart
    fetchDailyWeather(lat, lon); // this new daily data
    fetchHourlyWeather(lat, lon);
});
