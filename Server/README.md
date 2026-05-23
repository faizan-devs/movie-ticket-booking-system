# 🎬 Book My Ticket

A movie seat-booking REST API built with **Node.js**, **Express**, and **PostgreSQL**.  
Authentication is handled via **JWT (JSON Web Tokens)** with passwords hashed using **bcrypt**.

---

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Setup & Running Locally](#setup--running-locally)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication Flow](#authentication-flow)
- [Design Decisions](#design-decisions)

---

## Features

- ✅ User registration & login with JWT
- ✅ Protected endpoints via `authenticate` middleware
- ✅ Mock movie catalogue (5 movies)
- ✅ Seat booking linked to logged-in users
- ✅ Duplicate seat booking prevention (DB-level `UNIQUE` constraint + `FOR UPDATE` lock)
- ✅ One seat per user per movie enforcement
- ✅ Booking cancellation
- ✅ All original endpoints preserved unchanged

---

## Project Structure

```
book-my-ticket/
├── index.mjs                  # Entry point (original file, extended)
├── .env.example               # Environment variable template
├── src/
│   ├── db/
│   │   ├── pool.js            # Shared PostgreSQL connection pool
│   │   └── init.js            # Table creation & seeding on startup
│   ├── data/
│   │   └── movies.js          # Mock movie data
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   └── routes/
│       ├── auth.js            # /auth/* endpoints
│       ├── movies.js          # /movies/* endpoints
│       └── bookings.js        # /bookings/* endpoints
└── package.json
```

---

## Tech Stack

| Layer     | Technology    |
| --------- | ------------- |
| Runtime   | Node.js (ESM) |
| Framework | Express v5    |
| Database  | PostgreSQL    |
| Auth      | JWT + bcrypt  |
| Config    | dotenv        |

---

## Setup & Running Locally

### Prerequisites

- Node.js v18+
- PostgreSQL running locally (default port `5433`)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/book-my-ticket.git
cd book-my-ticket
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials and a strong JWT secret:

```env
PORT=8080

DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=sql_class_2_db

JWT_SECRET=change_this_to_a_strong_random_string
JWT_EXPIRES_IN=7d
```

### 4. Start the server

```bash
npm start
# or for auto-reload during development:
npm run dev
```

The server will:

1. Connect to PostgreSQL
2. Automatically create the `users`, `seats`, and `bookings` tables if they don't exist
3. Seed 20 seats if the seats table is empty
4. Start listening on `http://localhost:8080`

---

## Environment Variables

| Variable         | Default          | Description                 |
| ---------------- | ---------------- | --------------------------- |
| `PORT`           | `8080`           | Port the server listens on  |
| `DB_HOST`        | `localhost`      | PostgreSQL host             |
| `DB_PORT`        | `5433`           | PostgreSQL port             |
| `DB_USER`        | `postgres`       | PostgreSQL user             |
| `DB_PASSWORD`    | `postgres`       | PostgreSQL password         |
| `DB_NAME`        | `sql_class_2_db` | PostgreSQL database name    |
| `JWT_SECRET`     | `secret`         | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | `7d`             | JWT expiry duration         |

---

## Database Schema

```sql
-- Users table (new)
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seats table (original schema preserved)
CREATE TABLE seats (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(255),
  isbooked INT DEFAULT 0
);

-- Bookings table (new – links users ↔ seats per movie)
CREATE TABLE bookings (
  id        SERIAL PRIMARY KEY,
  user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat_id   INT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  movie_id  VARCHAR(50) NOT NULL,
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seat_id, movie_id)   -- prevents double-booking the same seat for a movie
);
```

---

## API Reference

### Auth

#### `POST /auth/register`

Register a new user.

**Body:**

```json
{ "name": "Alice", "email": "alice@example.com", "password": "secret123" }
```

**Response `201`:**

```json
{
	"message": "Registration successful.",
	"token": "<jwt>",
	"user": { "id": 1, "name": "Alice", "email": "alice@example.com" }
}
```

---

#### `POST /auth/login`

Login and receive a JWT.

**Body:**

```json
{ "email": "alice@example.com", "password": "secret123" }
```

**Response `200`:**

```json
{
	"message": "Login successful.",
	"token": "<jwt>",
	"user": { "id": 1, "name": "Alice", "email": "alice@example.com" }
}
```

---

#### `GET /auth/me` 🔒

Returns the profile of the logged-in user.

**Headers:** `Authorization: Bearer <token>`

---

### Movies (public)

#### `GET /movies`

Returns the full mock movie catalogue.

#### `GET /movies/:movieId`

Returns details of a single movie.

#### `GET /movies/:movieId/seats` 🔒

Returns all 20 seats with booking status for the given movie.

---

### Bookings 🔒 (all require `Authorization: Bearer <token>`)

#### `POST /bookings`

Book a seat.

**Body:**

```json
{ "movieId": "movie_001", "seatId": 5 }
```

**Response `201`:**

```json
{
	"message": "Seat booked successfully.",
	"booking": {
		"id": 1,
		"user_id": 1,
		"seat_id": 5,
		"movie_id": "movie_001",
		"booked_at": "2024-01-01T00:00:00.000Z",
		"movie": "Inception",
		"bookedBy": "Alice"
	}
}
```

---

#### `GET /bookings/my`

Returns all bookings made by the logged-in user.

---

#### `DELETE /bookings/:bookingId`

Cancels a booking (only the owner can cancel).

---

### Original Endpoints (unchanged)

| Method | Path         | Description                         |
| ------ | ------------ | ----------------------------------- |
| `GET`  | `/`          | Serves index.html                   |
| `GET`  | `/seats`     | Returns all seats                   |
| `PUT`  | `/:id/:name` | Legacy unauthenticated seat booking |
| `GET`  | `/health`    | Health check                        |

---

## Authentication Flow

```
Client                          Server
  │                               │
  │──POST /auth/register─────────▶│  Hash password, insert user
  │◀─── { token, user } ─────────│
  │                               │
  │──POST /auth/login────────────▶│  Verify password hash
  │◀─── { token, user } ─────────│
  │                               │
  │──POST /bookings ─────────────▶│
  │  Authorization: Bearer <token>│  Middleware verifies JWT
  │◀─── { booking } ─────────────│  Booking saved with user_id
```

### How the middleware works

`src/middleware/auth.js` extracts the `Bearer` token from the `Authorization` header, verifies it with `jwt.verify()`, and attaches the decoded payload to `req.user`. Any route that calls `authenticate` before its handler will reject unauthenticated requests with `401`.

---

## Design Decisions

| Decision                           | Rationale                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Separate `bookings` table**      | Keeps the original `seats` table intact while supporting per-movie booking tracking               |
| **`UNIQUE(seat_id, movie_id)`**    | Database-level enforcement means duplicate bookings are impossible even under race conditions     |
| **`FOR UPDATE` lock**              | Inherited from the original codebase; prevents two concurrent requests from booking the same seat |
| **One booking per user per movie** | Prevents seat hoarding — a user can hold at most one seat per movie                               |
| **Mock movie data**                | A plain JS array in `src/data/movies.js`; easy to swap out for a DB table later                   |
| **dotenv**                         | Keeps credentials out of source code                                                              |
| **bcrypt salt rounds = 10**        | Balances security and performance (industry standard)                                             |
