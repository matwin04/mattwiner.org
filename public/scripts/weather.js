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

    const queryString = new URLSearchParams(params).toString();
    const url = `https://api.open-meteo.com/v1/forecast?${queryString}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        const currentTemp = data.current?.temperature_2m;
        const isDay = data.current?.is_day;
        const timeZone = data.timezone_abbreviation;

        document.getElementById("weather-output").innerText =
            `Current Temp: ${currentTemp}°F | Daytime: ${isDay ? "Yes" : "No"} | ${timeZone}`;
        // Table Data
        const hours = data.hourly.time;
        const temps = data.hourly.temperature_2m;
        const weatherCodes = data.hourly.weather_code;
        const precipitation_probability = data.hourly.precipitation_probability;

        const now = new Date();
        const currentHour = now.getHours();
        const tbody = document.getElementById("forecast-body");
        tbody.innerHTML = "";
        //Datasets for Chart
        const labels = [];
        const tempData = [];
        const iconLabels = [];
        const rainData = [];
        for (let i = 0; i < hours.length; i++) {
            const hourDate = new Date(hours[i]);

            if (hourDate.getDate() === now.getDate() && hourDate.getHours() >= currentHour) {
                const hourStr = hourDate.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit"
                });
                const temp = Math.round(temps[i]);
                const code = data.hourly.weather_code[i];
                const rain = data.hourly.precipitation_probability[i];
                const icon = getWeatherIcon(code);

                // Table row
                const row = document.createElement("tr");
                if (tbody.children.length === 0) {
                    row.id = "current-hour";
                }

                const th = document.createElement("th");
                const tdTemp = document.createElement("td");
                const tdIcon = document.createElement("td");
                const tdRain = document.createElement("td");
                const iconSpan = document.createElement("span");

                iconSpan.classList.add("material-icons");
                iconSpan.textContent = icon;
                // Cell Content
                th.textContent = hourStr;
                tdTemp.textContent = `${temp}°F`;
                tdRain.textContent = `${rain}%`;
                tdIcon.appendChild(iconSpan);

                row.appendChild(th);
                row.appendChild(tdTemp);
                row.appendChild(tdRain);
                row.appendChild(tdIcon);
                tbody.appendChild(row);

                // Chart data
                labels.push(hourStr);
                tempData.push(temp);
                rainData.push(rain);
                iconLabels.push(`${temp}°F (${icon})`);

                if (labels.length >= 10) break;
            }
        }

        // 🎯 Create Chart.js chart after loop
        const ctx = document.getElementById("forecastChart").getContext("2d");
        new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Temperature (°F)",
                        data: tempData,
                        borderColor: "orange",
                        backgroundColor: "rgba(255,165,0,0.2)",
                        fill: true,
                        tension: 0.3,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return iconLabels[context.dataIndex];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: "Temp (°F)"
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Time"
                        }
                    }
                }
            }
        });
    } catch (err) {
        document.getElementById("weather-output").innerText = "Error fetching weather.";
        console.error("Weather fetch failed:", err);
    }
}
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

        for (let i = 0; i < daily.time.length && i < 10; i++) {
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
    fetchWeather(lat, lon); // your hourly + chart
    fetchDailyWeather(lat, lon); // this new daily data
});
