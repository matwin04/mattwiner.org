import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import cookieParser from 'cookie-parser';
import { engine } from 'express-handlebars';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8088;

// Setup Handlebars
app.engine('html', engine({
    extname: '.html',
    defaultLayout: false,
    partialsDir: path.join(__dirname, 'views/partials')
}));
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Utils
const getLibraryIds = () => {
    try {
        const filePath = path.join(__dirname, 'data', 'libraryCache.json');
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return {};
    }
};

const saveLibraryCache = (libraryMap) => {
    const cachePath = path.join(__dirname, 'data', 'libraryCache.json');
    fs.writeFileSync(cachePath, JSON.stringify(libraryMap, null, 2));
};

// Middleware
const requireAuth = (req, res, next) => {
    if (!req.cookies.token) return res.redirect('/mediamanager/login');
    next();
};

// Home
app.get('/', (req, res) => {
    res.render('index', { title: 'MATTWINER.ORG' });
});

// Login
app.get('/mediamanager/login', (req, res) => {
    res.render('mediamanager-login', { title: 'Login' });
});

app.post('/mediamanager/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const response = await fetch(`${process.env.HOST}/Users/AuthenticateByName`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Emby-Authorization': 'MediaBrowser Client="MediaManager", Device="Browser", DeviceId="vercel-client", Version="1.0"',
            },
            body: JSON.stringify({ Username: username, Pw: password })
        });

        if (!response.ok) throw new Error('Login failed');
        const data = await response.json();
        const token = data.AccessToken;
        const userId = data.User.Id;

        res.cookie('token', token, { httpOnly: true });
        res.cookie('userId', userId, { httpOnly: true });

        // Auto-refresh library cache
        const viewsRes = await fetch(`${process.env.HOST}/Users/${userId}/Views`, {
            headers: { 'X-Emby-Token': token }
        });
        const viewsData = await viewsRes.json();

        const libraryMap = {};
        for (const item of viewsData.Items) {
            if (item.CollectionType) {
                libraryMap[item.CollectionType] = item.Id;
            }
        }

        saveLibraryCache(libraryMap);
        console.log('✅ Refreshed library cache:', libraryMap);

        res.redirect('/mediamanager');
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).send('Login failed.');
    }
});

// Logout
app.get('/mediamanager/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('userId');
    res.redirect('/mediamanager/login');
});

// Dashboard
app.get('/mediamanager', requireAuth, (req, res) => {
    const mediaTypes = [
        { name: 'Music', route: '/mediamanager/music', icon: '🎵' },
        { name: 'Movies', route: '/mediamanager/movies', icon: '🎬' },
        { name: 'TV Shows', route: '/mediamanager/tvshows', icon: '📺' },
        { name: 'Podcasts', route: '/mediamanager/podcasts', icon: '🎙' },
        { name: 'Photos', route: '/mediamanager/photos', icon: '🖼' },
        { name: 'Videos', route: '/mediamanager/videos', icon: '📹' }
    ];
    res.render('mediamanager', { title: 'Media Dashboard', mediaTypes });
});

// Movies
app.get('/mediamanager/movies', requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;
    const ids = getLibraryIds();
    try {
        const r = await fetch(`${process.env.HOST}/Users/${userId}/Items?ParentId=${ids.movies}&IncludeItemTypes=Movie`, {
            headers: { 'X-Emby-Token': token }
        });
        const result = await r.json();
        res.render('mediamanager-movies', { title: 'Movies', items: result.Items || [] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to load movies');
    }
});

// TV Shows
app.get('/mediamanager/tvshows', requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;
    const ids = getLibraryIds();
    try {
        const r = await fetch(`${process.env.HOST}/Users/${userId}/Items?ParentId=${ids.tvshows}&IncludeItemTypes=Series`, {
            headers: { 'X-Emby-Token': token }
        });
        const result = await r.json();
        res.render('mediamanager-shows', { title: 'TV Shows', items: result.Items || [] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to load shows');
    }
});
app.get('/getviews', requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;
    try {
        const response = await fetch(`${process.env.HOST}/Users/${userId}/Views`, {
            headers: { 'X-Emby-Token': token }
        });
        const viewsData = await response.json();
        const libraryMap = {};
        for (const item of viewsData.Items) {
            if (item.CollectionType) {
                libraryMap[item.CollectionType] = item.Id;
            }
        }
        const dataDir = path.join(__dirname, 'data');
        const cachePath = path.join(__dirname, 'data', 'libraryCache.json');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }
        fs.writeFileSync(cachePath, JSON.stringify(libraryMap, null, 2));

        console.log('✅ libraryCache.json created from /getviews:', libraryMap);
        res.send('<h2>✅ libraryCache.json created. <a href="/mediamanager">Return to Dashboard</a></h2>');
    } catch (error) {
        console.error('Error fetching views or saving cache:', error);
        res.status(500).send('❌ Failed to create libraryCache.json');
    }
});
export default app;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 Server at http://localhost:${PORT}`));
}