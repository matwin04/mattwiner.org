import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import cookieParser from 'cookie-parser';
import {engine} from "express-handlebars";
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8088;

app.engine('html', engine({ extname: '.html', defaultLayout: false }));
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
// JSON loading helper
const getLinks = (filename) => {
    try {
        const filePath = path.join(__dirname, 'public', filename);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return data;
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return [];
    }
};
const requireAuth = (req, res, next) => {
    if (!req.cookies.token) {
        return res.redirect('/mediamanager/login');
    }
    next();
};
app.get('/', (req, res) => {
    const links = getLinks('links.json');
    res.render('index', {title:"MATTWINER.ORG",links});
});
app.get('/mediamanager', (req, res) => {
    res.render('mediamanager');
});
// Show login page (GET)
app.get('/mediamanager/login', (req, res) => {
    res.render('mediamanager-login', { title: 'MediaManager Login' });
});

// Handle login form (POST)
app.post('/mediamanager/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const response = await fetch('https://media.mattwiner.org/Users/AuthenticateByName', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Emby-Authorization': 'MediaBrowser Client="MediaManager", Device="Browser", DeviceId="vercel-client", Version="1.0"',
            },
            body: JSON.stringify({ Username: username, Pw: password }),
        });

        if (!response.ok) throw new Error('Login failed');

        const data = await response.json();

        res.cookie('token', data.AccessToken, { httpOnly: true });
        res.cookie('userId', data.User.Id, { httpOnly: true });

        res.redirect('/mediamanager');
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).send('Invalid username or password.');
    }
});
export default app;

// Local dev support
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}