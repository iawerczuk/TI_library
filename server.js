const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

const db = new Database('library.db');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS members(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS books(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  copies INTEGER NOT NULL DEFAULT 1 CHECK(copies >= 0)
);
CREATE TABLE IF NOT EXISTS loans(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id),
  book_id INTEGER NOT NULL REFERENCES books(id),
  loan_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  return_date TEXT NULL
);
`);

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
};

app.get('/api/members', (req, res) => {
  const rows = db.prepare('SELECT id,name,email FROM members ORDER BY name').all();
  res.json(rows);
});

app.post('/api/members', (req, res) => {
  const { name, email } = req.body || {};
  if (!name?.trim() || !email?.trim())
    return res.status(400).send('Name and email are required');
  try {
    const info = db.prepare('INSERT INTO members(name,email) VALUES(?,?)')
      .run(name.trim(), email.trim());
    const created = db.prepare('SELECT id,name,email FROM members WHERE id=?')
      .get(info.lastInsertRowid);
    res.location(`/api/members/${created.id}`).status(201).json(created);
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(409).send('Email already exists');
    res.status(500).send('Insert failed');
  }
});

app.get('/api/books', (req, res) => {
  const { author } = req.query;
  const skip = Number.isFinite(+req.query.skip) ? Math.max(0, +req.query.skip) : 0;
  const take = Number.isFinite(+req.query.take) ? Math.min(100, Math.max(1, +req.query.take)) : 20;

  let sql = `
    SELECT b.id, b.title, b.author, b.copies,
           b.copies - IFNULL((SELECT COUNT(1)
                              FROM loans l
                              WHERE l.book_id=b.id AND l.return_date IS NULL), 0) AS available
    FROM books b`;
  const params = [];
  if (author?.trim()) {
    sql += ' WHERE b.author LIKE ?';
    params.push(`%${author.trim()}%`);
  }
  sql += ' ORDER BY b.title LIMIT ? OFFSET ?';
  params.push(take, skip);

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.post('/api/books', (req, res) => {
  const { title, author, copies = 1 } = req.body || {};
  if (!title?.trim() || !author?.trim())
    return res.status(400).send('Title and author are required');
  if (copies < 0) return res.status(400).send('Copies must be >= 0');

  const info = db.prepare(
    'INSERT INTO books(title,author,copies) VALUES(?,?,?)'
  ).run(title.trim(), author.trim(), copies | 0);

  const created = db.prepare('SELECT * FROM books WHERE id=?')
    .get(info.lastInsertRowid);

  res.location(`/api/books/${created.id}`).status(201).json(created);
});

app.get('/api/loans', (req, res) => {
  const rows = db.prepare(`
    SELECT l.id, m.name AS member, b.title AS book,
           l.loan_date, l.due_date, l.return_date
    FROM loans l
    JOIN members m ON m.id = l.member_id
    JOIN books b ON b.id = l.book_id
    ORDER BY l.id DESC
  `).all();
  res.json(rows);
});

const borrowTx = db.transaction(({ memberId, bookId, days }) => {
  const m = db.prepare('SELECT id FROM members WHERE id=?').get(memberId);
  const b = db.prepare('SELECT id, copies FROM books WHERE id=?').get(bookId);
  if (!m || !b) return { status: 400, body: 'Invalid member or book' };

  const active = db.prepare(
    'SELECT COUNT(1) AS c FROM loans WHERE book_id=? AND return_date IS NULL'
  ).get(bookId).c;
  if (active >= b.copies) return { status: 409, body: 'No available copies' };

  const loanDate = today();
  const dueDate = addDays(loanDate, days && days > 0 ? days : 14);
  const info = db.prepare(
    'INSERT INTO loans(member_id,book_id,loan_date,due_date) VALUES(?,?,?,?)'
  ).run(memberId, bookId, loanDate, dueDate);

  const created = db.prepare('SELECT * FROM loans WHERE id=?').get(info.lastInsertRowid);
  return { status: 201, body: created };
});

app.post('/api/loans/borrow', (req, res) => {
  const { member_id, book_id, days } = req.body || {};
  const result = borrowTx({
    memberId: +member_id,
    bookId: +book_id,
    days: days ? +days : undefined
  });
  res.status(result.status).send(result.body);
});

app.post('/api/loans/return', (req, res) => {
  const { loan_id } = req.body || {};
  const loan = db.prepare('SELECT * FROM loans WHERE id=?').get(+loan_id);
  if (!loan) return res.status(404).send('Loan not found');
  if (loan.return_date) return res.status(409).send('Already returned');
  db.prepare('UPDATE loans SET return_date=? WHERE id=?').run(today(), loan.id);
  res.json(db.prepare('SELECT * FROM loans WHERE id=?').get(loan.id));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 5050;
app.listen(port, () => console.log(`📚 Library API running at http://localhost:${port}`));