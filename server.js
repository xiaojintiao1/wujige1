const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}
function saveData(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));

app.get('/api/content', (req, res) => res.json(loadData()));

app.post('/admin/upload', upload.single('image'), (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({error:'未登录'});
  res.json({ url: '/uploads/' + req.file.filename });
});

app.get('/admin', (req, res) => {
  if (req.session.loggedIn) return res.redirect('/admin/edit');
  res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.post('/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.loggedIn = true;
    res.redirect('/admin/edit');
  } else res.send('<script>alert("密码错误");location="/admin"</script>');
});

app.get('/admin/edit', (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/admin');
  res.sendFile(path.join(__dirname, 'views/edit.html'));
});

app.post('/admin/save', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).send('未登录');
  const data = loadData();
  Object.assign(data, req.body);
  if (req.body.products) try { data.products = JSON.parse(req.body.products); } catch {}
  saveData(data);
  res.send('<script>alert("保存成功");location="/admin/edit"</script>');
});

app.get('/admin/logout', (req, res) => { req.session.destroy(); res.redirect('/admin'); });

app.listen(PORT, () => console.log('Running on', PORT));
