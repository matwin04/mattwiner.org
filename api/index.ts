const express = require("express");
const path = require("path");
const { engine } = require("express-handlebars");
const fs = require("fs");

const app = express(); // ✅ Define `app` before using it!
const PORT = process.env.PORT || 8088;

// Configure Handlebars to use `.html` instead of `.hbs`
app.engine("html", engine({ extname: ".html", defaultLayout: false }));
app.set("view engine", "html");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.render("index", { title: "MW" }));

// Vercel support: Export Express app
module.exports = app;

// Start server locally
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
