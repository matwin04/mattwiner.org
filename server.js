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

app.engine('html', engine({ extname: '.html', defaultLayout: false,partialsDir: path.join(__dirname, 'views/partials')}));
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
app.get('/mediamanager', requireAuth, async (req, res) => {
    const mediaTypes = [
        { name: 'Music', route: '/mediamanager/music', icon: '🎵' },
        { name: 'Movies', route: '/mediamanager/movies', icon: '🎬' },
        { name: 'TV Shows', route: '/mediamanager/tvshows', icon: '📺' },
        { name: 'Podcasts', route: '/mediamanager/podcasts', icon: '🎙' },
        { name: 'Photos', route: '/mediamanager/photos', icon: '🖼' },
        { name: 'Videos', route: '/mediamanager/videos', icon: '📹' },
    ];
    res.render('mediamanager', {
        title: "MATTWINER.ORG",
        mediaTypes
    });
});
// Show login page (GET)
app.get('/mediamanager/login', (req, res) => {
    res.render('mediamanager-login', { title: 'MediaManager Login' });
});
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
app.get('/mediamanager/user', requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;
    try {
        const response = await fetch(`${process.env.HOST}/Users/${userId}`, {
            headers: { 'X-Emby-Token': token }
        });

        const user = await response.json();
        res.render('mediamanager-user', {
            title: 'User Dashboard',
            user
        });
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).send('Could not load user dashboard');
    }
});


// LOGOUT
app.get('/mediamanager/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('userId');
    res.redirect('/mediamanager/login');
});
export default app;

// Local dev support
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}