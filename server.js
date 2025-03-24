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
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(libraryMap, null, 2));
};

const requireAuth = (req, res, next) => {
    if (!req.cookies.token) return res.redirect('/mediamanager/login');
    next();
};

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'MATTWINER.ORG' });
});

app.get('/mediamanager/login', (req, res) => {
    res.render('mediamanager-login', { title: 'Login' });
});

app.post('/mediamanager/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log(`🔐 Attempting login as ${username}`);

        const response = await fetch(`${process.env.HOST}/Users/AuthenticateByName`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Emby-Authorization': 'MediaBrowser Client="MediaManager", Device="Browser", DeviceId="vercel-client", Version="1.0"',
            },
            body: JSON.stringify({ Username: username, Pw: password })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`❌ Login failed. Status ${response.status}: ${errorBody}`);
            return res.status(401).send('Login failed: invalid credentials or request format.');
        }

        const data = await response.json();

        const token = data.AccessToken;
        const userId = data.User.Id;

        if (!token || !userId) {
            console.error('❌ Login failed: Missing token or user ID in response.');
            return res.status(401).send('Login failed: unexpected server response.');
        }

        res.cookie('token', token, { httpOnly: true });
        res.cookie('userId', userId, { httpOnly: true });

        console.log('✅ Login successful:', { token, userId });

        // Auto-refresh library cache
        const viewsRes = await fetch(`${process.env.HOST}/Users/${userId}/Views`, {
            headers: { 'X-Emby-Token': token }
        });

        if (!viewsRes.ok) {
            const errorBody = await viewsRes.text();
            console.error(`❌ Failed to fetch views. Status ${viewsRes.status}: ${errorBody}`);
            return res.status(500).send('Failed to fetch views.');
        }

        const viewsData = await viewsRes.json();
        const libraryMap = {};

        for (const item of viewsData.Items) {
            if (item.CollectionType) {
                libraryMap[item.CollectionType] = item.Id;
            }
        }

        saveLibraryCache(libraryMap);
        console.log('📁 Library cache updated:', libraryMap);

        res.redirect('/mediamanager');
    } catch (error) {
        console.error('Login error (catch block):', error);
        res.status(500).send('Unexpected login error.');
    }
});
app.get('/mediamanager/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('userId');
    res.redirect('/mediamanager/login');
});

app.get('/mediamanager', requireAuth, (req, res) => {
    const mediaTypes = [
        { name: 'Music', route: '/mediamanager/music', icon: '🎵' },
        { name: 'Movies', route: '/mediamanager/movies', icon: '🎬' },
        { name: 'TV Shows', route: '/mediamanager/shows', icon: '📺' },
        { name: 'Podcasts', route: '/mediamanager/podcasts', icon: '🎙' },
        { name: 'Photos', route: '/mediamanager/photos', icon: '🖼' },
        { name: 'Videos', route: '/mediamanager/videos', icon: '📹' }
    ];
    res.render('mediamanager', { title: 'Media Dashboard', mediaTypes });
});
app.get('/mediamanager/movies', requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;
    const ids = getLibraryIds();
    try {
        const r = await fetch(`${process.env.HOST}/Users/${userId}/Items?ParentId=${ids.movies}&IncludeItemTypes=Movie`, {
            headers: { 'X-Emby-Token': token }
        });

        if (!r.ok) throw new Error(`Failed to fetch movies: ${r.status}`);
        const result = await r.json();
        res.render('mediamanager-movies', { title: 'Movies', items: result.Items || [] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to load movies');
    }
});

app.get('/mediamanager/shows', requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;
    const ids = getLibraryIds();
    try {
        const r = await fetch(`${process.env.HOST}/Users/${userId}/Items?ParentId=${ids.tvshows}&IncludeItemTypes=Series`, {
            headers: { 'X-Emby-Token': token }
        });

        if (!r.ok) throw new Error(`Failed to fetch shows: ${r.status}`);
        const result = await r.json();
        res.render('mediamanager-shows', { title: 'TV Shows', items: result.Items || [] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to load TV shows');
    }
});

app.get('/mediamanager/shows/:id', requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;
    const showId = req.params.id;

    try {
        const episodesRes = await fetch(`${process.env.HOST}/Shows/${showId}/Episodes?UserId=${userId}`, {
            headers: { 'X-Emby-Token': token }
        });

        if (!episodesRes.ok) {
            const text = await episodesRes.text();
            console.error('❌ Error fetching episodes:', text);
            return res.status(500).send('Could not load episodes');
        }

        const episodesData = await episodesRes.json();

        const showRes = await fetch(`${process.env.HOST}/Items/${showId}`, {
            headers: { 'X-Emby-Token': token }
        });

        if (!showRes.ok) {
            const text = await showRes.text();
            console.error('❌ Error fetching show info:', text);
            return res.status(500).send('Could not load show');
        }

        const show = await showRes.json();

        res.render('mediamanager-episodes', {
            title: `Episodes - ${show.Name}`,
            showName: show.Name,
            episodes: episodesData.Items || []
        });

    } catch (err) {
        console.error('❌ Exception in show/:id route:', err);
        res.status(500).send('Unexpected error');
    }
});

app.get('/getviews', requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;
    try {
        const response = await fetch(`${process.env.HOST}/Users/${userId}/Views`, {
            headers: { 'X-Emby-Token': token }
        });

        if (!response.ok) throw new Error(`Failed to fetch views: ${response.status}`);
        const viewsData = await response.json();

        const libraryMap = {};
        for (const item of viewsData.Items) {
            if (item.CollectionType) {
                libraryMap[item.CollectionType] = item.Id;
            }
        }

        saveLibraryCache(libraryMap);
        console.log('✅ libraryCache.json created from /getviews:', libraryMap);
        res.send('<h2>✅ libraryCache.json created. <a href="/mediamanager">Return to Dashboard</a></h2>');
    } catch (error) {
        console.error('Error fetching views or saving cache:', error);
        res.status(500).send('❌ Failed to create libraryCache.json');
    }
});

// Start
export default app;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 Server at http://localhost:${PORT}`));
}