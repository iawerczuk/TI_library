const API = window.API_BASE || 'http://localhost:5050';

const qs  = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => [...el.querySelectorAll(s)];
const json = r => r.ok ? r.json() : r.text().then(t => Promise.reject({status:r.status,text:t}));

const memberForm = qs('#member-form');
const memberMsg  = qs('#member-msg');
const memberSelect = qs('#member-select');

const bookForm = qs('#book-form');
const bookMsg  = qs('#book-msg');
const booksTbody = qs('#books tbody');
const loansTbody = qs('#loans tbody');
const overdueTbody = qs('#overdue tbody');

const state = { author:'', skip:0, take:10 };

async function loadMembers(){
  const data = await fetch(`${API}/api/members`).then(json);
  memberSelect.innerHTML = '';
  for(const m of data){
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (${m.email})`;
    memberSelect.appendChild(opt);
  }
}

async function loadBooks(){
  const qsParams = new URLSearchParams({
    author: state.author,
    skip: String(state.skip),
    take: String(state.take)
  });
  const data = await fetch(`${API}/api/books?${qsParams}`).then(json);
  booksTbody.innerHTML = '';
  for(const b of data){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.title}</td>
      <td>${b.author}</td>
      <td>${b.copies}</td>
      <td>${b.available}</td>
      <td><button ${b.available<=0?'disabled':''}>Wypożycz</button></td>`;
    tr.querySelector('button')?.addEventListener('click', async () => {
      const memberId = +memberSelect.value;
      if(!memberId){ alert('Wybierz czytelnika'); return; }
      const resp = await fetch(`${API}/api/loans/borrow`, {
        method:'POST',
        headers:{'content-type':'application/json'},
        body: JSON.stringify({member_id: memberId, book_id: b.id})
      });
      if(resp.status===201) toast('Wypożyczono');
      else if(resp.status===409) toast('Brak dostępnych egzemplarzy');
      else toast('Błąd wypożyczenia');
      await Promise.all([loadBooks(), loadLoans(), loadOverdue()]);
    });
    booksTbody.appendChild(tr);
  }
  qs('#prev').disabled = state.skip === 0;
  qs('#next').disabled = data.length < state.take;
}

async function loadLoans(){
  const data = await fetch(`${API}/api/loans`).then(json);
  loansTbody.innerHTML = '';
  for(const l of data){
    const active = !l.return_date;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.id}</td>
      <td>${l.member}</td>
      <td>${l.book}</td>
      <td>${l.loan_date}</td>
      <td>${l.due_date}</td>
      <td>${active ? '<span class="badge warn">aktywne</span>' : '<span class="badge ok">zwrócone</span>'}</td>
      <td>${active ? '<button class="ret">Zwróć</button>' : ''}</td>`;
    const btn = tr.querySelector('button.ret');
    if(btn){
      btn.addEventListener('click', async () => {
        const resp = await fetch(`${API}/api/loans/return`, {
          method:'POST',
          headers:{'content-type':'application/json'},
          body: JSON.stringify({loan_id: l.id})
        });
        if(resp.ok) toast('Zwrócono');
        else toast('Nie można zwrócić');
        await Promise.all([loadBooks(), loadLoans(), loadOverdue()]);
      });
    }
    loansTbody.appendChild(tr);
  }
}

async function loadOverdue(){
  const data = await fetch(`${API}/api/loans/overdue`).then(json).catch(()=>[]);
  overdueTbody.innerHTML = '';
  for(const r of data){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.id}</td><td>${r.member}</td><td>${r.book}</td><td>${r.due_date}</td>`;
    overdueTbody.appendChild(tr);
  }
}

memberForm.addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(memberForm);
  const body = Object.fromEntries(fd.entries());
  try{
    const created = await fetch(`${API}/api/members`, {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify(body)
    }).then(json);
    memberMsg.textContent = `Dodano: ${created.name}`;
    memberForm.reset();
    await loadMembers();
  }catch(err){
    memberMsg.textContent = err.status===409 ? '⚠️ Email już istnieje' : `Błąd (${err.status})`;
  }
});

bookForm.addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(bookForm);
  const body = Object.fromEntries(fd.entries());
  body.copies = +body.copies || 0;
  try{
    await fetch(`${API}/api/books`, {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify(body)
    }).then(json);
    bookMsg.textContent = 'Książka dodana!';
    bookForm.reset(); bookForm.elements.copies.value = 1;
    await loadBooks();
  }catch(err){
    bookMsg.textContent = `Błąd (${err.status})`;
  }
});

qs('#filter-form')?.addEventListener('submit', e => {
  e.preventDefault();
  state.author = qs('#filter-author').value.trim();
  state.skip = 0;
  loadBooks();
});
qs('#prev')?.addEventListener('click', () => {
  state.skip = Math.max(0, state.skip - state.take);
  loadBooks();
});
qs('#next')?.addEventListener('click', () => {
  state.skip += state.take;
  loadBooks();
});

function toast(msg){
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.position='fixed';
  t.style.right='16px';
  t.style.bottom='16px';
  t.style.background='#0a1e78';
  t.style.color='#fff';
  t.style.padding='10px 16px';
  t.style.borderRadius='10px';
  t.style.fontWeight='600';
  t.style.boxShadow='0 2px 6px rgba(0,0,0,.2)';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2000);
}

(async function init(){
  await loadMembers();
  await loadBooks();
  await loadLoans();
  await loadOverdue();
})();