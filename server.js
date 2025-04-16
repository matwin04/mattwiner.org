import postgres from "postgres";
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import { inject } from "@vercel/analytics";

inject();
dotenv.config();
const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VIEWS_DIR = path.join(__dirname, "views");
const PARTIALS_DIR = path.join(VIEWS_DIR, "partials");
app.engine("html", engine({ extname: ".html", defaultLayout: false, partialsDir: PARTIALS_DIR }));
app.set("view engine", "html");
app.set("views", VIEWS_DIR);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(path.join(__dirname, "public")));
// ✅ Ensure the POIs table exists
// ✅ Ensure the Users & POIs Table Exist


async function setupDB() {
    console.log("Starting DB...");
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`;
        await sql`
            CREATE TABLE IF NOT EXISTS links (
                id SERIAL PRIMARY KEY,
                link TEXT NOT NULL,
                server_name TEXT NOT NULL,
                status TEXT DEFAULT 'unknown',
                icon TEXT DEFAULT 'info'
            )`;
        await sql`
            CREATE TABLE IF NOT EXISTS photos (
                id SERIAL PRIMARY KEY,
                filename TEXT NOT NULL,
                camera TEXT NOT NULL,
                date TIMESTAMP,
                description TEXT NOT NULL
            )`;


        console.log("✅ Users & POIs tables ready");
    } catch (err) {
        console.error("❌ Database setup failed:", err);
    }
}
setupDB();
inject();
// HOME ROUTE
app.get("/", async (req, res) => {
    try {
        const links = await sql`SELECT * FROM links ORDER BY id`;
        res.render("index", { title: "MW.ORG", links });
    } catch (err) {
        console.error("Error loading links:", err);
        res.status(500).send("Server error");
    }
});
app.get("/about", (req, res) => {
    res.render("about", { title: "ABOUT" });
})
app.get("/photos", async (req, res) => {
    const photos = await sql`SELECT * FROM photos ORDER BY date DESC`;
    res.render("photos", { title: "Photos", photos });
});
if (!process.env.VERCEL && !process.env.NOW_REGION) {
    const PORT = process.env.PORT || 8088;
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}
export default app;