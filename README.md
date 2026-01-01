# Library API

Aplikacja realizująca obsługę małej biblioteki: czytelnicy, książki oraz wypożyczenia.

---

## Technologia

- **Backend:** Node.js (Express)
- **Baza danych:** SQLite
- **Interfejs:** Katalog `public/`

---

## Uruchomienie

1. Zainstaluj zależności:
   bash
   npm install

```

2. Uruchom serwer:
```bash
node server.js

```


3. Adres aplikacji: `http://localhost:5050`

## Zakres funkcjonalny

* **Zarządzanie czytelnikami:** Dodawanie i listowanie czytelników (unikalny adres email).
* **Zarządzanie księgozbiorem:** Dodawanie i listowanie książek (liczba egzemplarzy).
* **Obsługa wypożyczeń:** Wypożyczanie i zwrot książek.
* **Logika biznesowa:** Blokada wypożyczenia przy braku dostępnych egzemplarzy.

## API (skrót)

* `POST /api/members` – Dodanie czytelnika
* `GET /api/members` – Lista czytelników
* `POST /api/books` – Dodanie książki
* `GET /api/books` – Lista książek (z liczbą dostępnych egzemplarzy)
* `POST /api/loans/borrow` – Wypożyczenie
* `POST /api/loans/return` – Zwrot

## Walidacja i statusy HTTP

* **201 Created** – poprawne utworzenie
* **200 OK** – poprawna operacja
* **400 / 422** – błędne dane wejściowe
* **404 Not Found** – brak zasobu
* **409 Conflict**:
* brak wolnych egzemplarzy
* duplikat emaila czytelnika

## Testowanie

Plik `tests.http` zawiera przykładowe wywołania endpointów. Testy wykonano przy użyciu VS Code (rozszerzenie REST Client).
