async function fetchRoutes(routeID) {
    const url = `https://transit.land/api/v2/rest/routes/${routeID}`;
    const options = { method: "GET", headers: { apikey: "WOo9vL8ECMWN76EcKjsNGfo8YgNZ7c2u" } };

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        const tbody = document.getElementById("transit-route-body");
        const stopsBody = document.getElementById("transit-stops-body");
        const routes = data.routes;

        console.log(routes.length);
        for (let i = 0; i < routes.length; i++) {
            const stops = data.routes[i].route_stops;
            console.log(stops.length);
            for (let j = 0; j < stops.length; j++) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${stops[j].stop.id}</td>
                    <td>${stops[j].stop.stop_id}</td>
                    <td>${stops[j].stop.stop_name}</td>
                    
                `;
                stopsBody.appendChild(row);
            }
            console.log(stops);
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${routes[i].route_short_name}
                <td>${routes[i].id}</td>
                <td>${routes[i].route_long_name}</td>
                <td>${routes[i].route_color}</td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error(error);
    }
}

fetchRoutes("r-9mu-ocline");
