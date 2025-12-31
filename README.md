Library API

Aplikacja realizująca obsługę małej biblioteki: czytelnicy, książki oraz wypożyczenia.

Technologia

Backend: Node.js (Express)
Baza danych: SQLite
Interfejs: Katalog public/
Uruchomienie

npm install
node server.js
Adres: http://localhost:5050
Zakres funkcjonalny

Dodawanie i listowanie czytelników (email unikalny).
Dodawanie i listowanie książek (liczba egzemplarzy).
Wypożyczanie i zwrot książek.
Blokada wypożyczenia przy braku dostępnych egzemplarzy.
API

POST /api/members - Dodanie czytelnika
GET /api/members - Lista czytelników
POST /api/books - Dodanie książki
GET /api/books - Lista książek (z liczbą dostępnych egzemplarzy)
POST /api/loans/borrow - Wypożyczenie
POST /api/loans/return - Zwrot
Walidacja i statusy HTTP

201 Created – poprawne utworzenie
200 OK – poprawna operacja
400 / 422 – błędne dane wejściowe
404 Not Found – brak zasobu
409 Conflict – brak wolnych egzemplarzy lub duplikat emaila czytelnika
Testowanie

Plik tests.http zawiera przykładowe wywołania endpointów. Testy wykonano przy użyciu VS Code (rozszerzenie REST Client).

Scenariusze:

Poprawne dodanie danych (happy path).
Próby niepoprawne (409 Conflict).
Wypożyczenie i zwrot bez restartu aplikacji.