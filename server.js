import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import cookieParser from 'cookie-parser';
import { engine } from 'express-handlebars';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8088;

// Set up handlebars
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

// Auth middleware
const requireAuth = async (req, res, next) => {
    const { token, userId } = req.cookies;

    if (!token || !userId) {
        return res.redirect('/mediamanager/login');
    }

    try {
        const ping = await fetch(`${process.env.HOST}/Users/${userId}`, {
            headers: { 'X-Emby-Token': token }
        });

        if (!ping.ok) {
            console.warn(`❌ Invalid/expired token: ${ping.status}`);
            res.clearCookie('token');
            res.clearCookie('userId');
            return res.redirect('/mediamanager/login');
        }

        next();
    } catch (err) {
        console.error('Auth check failed:', err);
        return res.redirect('/mediamanager/login');
    }
};

// Utility to get a library ID by collectionType (e.g., "movies", "tvshows")
async function getLibraryId(collectionType, token, userId) {
    const response = await fetch(`${process.env.HOST}/Users/${userId}/Views`, {
        headers: { 'X-Emby-Token': token }
    });

    if (!response.ok) throw new Error(`Could not fetch views: ${response.status}`);
    const data = await response.json();

    const match = data.Items.find(item => item.CollectionType === collectionType);
    return match ? match.Id : null;
}

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

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Login failed: ${response.status} — ${text}`);
        }

        const data = await response.json();
        const token = data.AccessToken;
        const userId = data.User.Id;

        res.cookie('token', token, { httpOnly: true });
        res.cookie('userId', userId, { httpOnly: true });

        console.log('✅ Login successful:', { userId });
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
        { name: 'TV Shows', route: '/mediamanager/shows', icon: '📺' },
        { name: 'Podcasts', route: '/mediamanager/podcasts', icon: '🎙' },
        { name: 'Photos', route: '/mediamanager/photos', icon: '🖼' },
        { name: 'Videos', route: '/mediamanager/videos', icon: '📹' }
    ];
    res.render('mediamanager', { title: 'Media Dashboard', mediaTypes });
});

// Movies
app.get('/mediamanager/movies', requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;

    try {
        const id = await getLibraryId('movies', token, userId);
        if (!id) throw new Error('Movies library not found');

        const r = await fetch(`${process.env.HOST}/Users/${userId}/Items?ParentId=${id}&IncludeItemTypes=Movie`, {
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

// Shows
app.get('/mediamanager/shows', requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;

    try {
        const id = await getLibraryId('tvshows', token, userId);
        if (!id) throw new Error('TV Shows library not found');

        const r = await fetch(`${process.env.HOST}/Users/${userId}/Items?ParentId=${id}&IncludeItemTypes=Series`, {
            headers: { 'X-Emby-Token': token }
        });

        if (!r.ok) throw new Error(`Failed to fetch shows: ${r.status}`);
        const result = await r.json();

        res.render('mediamanager-shows', { title: 'TV Shows', items: result.Items || [] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to load shows');
    }
});
// Show → Episodes
app.get('/mediamanager/shows/:id', requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;
    const showId = req.params.id;
    try {
        const episodesRes = await fetch(`${process.env.HOST}/Shows/${showId}/Episodes?UserId=${userId}`, {
            headers: { 'X-Emby-Token': token }
        });
        if (!episodesRes.ok) throw new Error(`Episodes fetch failed: ${episodesRes.status}`);
        const episodesData = await episodesRes.json();
        const showRes = await fetch(`${process.env.HOST}/Items/${showId}`, {
            headers: { 'X-Emby-Token': token }
        });
        if (!showRes.ok) throw new Error(`Show fetch failed: ${showRes.status}`);
        const show = await showRes.json();
        res.render('mediamanager-episodes', {
            title: `Episodes – ${show.Name}`,
            show,
            items: episodesData.Items || []
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to load episodes');
    }
});
app.get('/mediamanager/user/:userId', requireAuth, async (req, res) => {
    const { token } = req.cookies;
    const userId = req.params.userId;
    try {
        const response = await fetch(`${process.env.HOST}/Users/${userId}`, {
            headers: { 'X-Emby-Token': token }
        });
        if (!response.ok) throw new Error(`User fetch failed: ${response.status}`);
        const user = await response.json();
        res.render('mediamanager-user', {
            title: `${user.Name}'s Profile`,
            user
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to load user info');
    }
});
app.get('/mediamanager/play/:id',requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;
    const itemId = req.params.id;
    try {
        const response = await fetch(`${process.env.HOST}/Items/${itemId}`, {
            headers: { 'X-Emby-Token': token }
        });
        if (!response.ok) throw new Error(`Player fetch failed: ${response.status}`);
        const item = await response.json();
        res.render('mediamanager-player', {
            title: `Playing ${item.Name}`,
            item,
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to load player info');
    }
});
// /getviews route – just view raw views from Jellyfin
app.get('/getviews', requireAuth, async (req, res) => {
    const { token, userId } = req.cookies;
    try {
        const response = await fetch(`${process.env.HOST}/Users/${userId}/Views`, {
            headers: { 'X-Emby-Token': token }
        });

        const views = await response.json();
        res.json(views.Items);
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to fetch views');
    }
});

// Start
export default app;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 Server at http://localhost:${PORT}`));
}