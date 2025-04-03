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


// Home
app.get('/', (req, res) => {
    res.render('index', { title: 'MATTWINER.ORG' });
});


// Start
export default app;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 Server at http://localhost:${PORT}`));
}