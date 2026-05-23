import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import pool from './src/db/pool.js';
import { initDB } from './src/db/init.js';

import authRouter from './src/routes/auth.js';
import moviesRouter from './src/routes/movies.js';
import bookingsRouter from './src/routes/bookings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 8080;

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/movies', moviesRouter);
app.use('/bookings', bookingsRouter);

app.get('/seats', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM seats');
		res.send(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Internal server error.' });
	}
});

app.put('/:id/:name', async (req, res) => {
	try {
		const id = req.params.id;
		const name = req.params.name;

		const conn = await pool.connect();
		await conn.query('BEGIN');

		const sql = 'SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE';
		const result = await conn.query(sql, [id]);

		if (result.rowCount === 0) {
			await conn.query('ROLLBACK');
			conn.release();
			return res.send({ error: 'Seat already booked' });
		}

		const sqlU = 'UPDATE seats SET isbooked = 1, name = $2 WHERE id = $1';
		const updateResult = await conn.query(sqlU, [id, name]);

		await conn.query('COMMIT');
		conn.release();

		res.send(updateResult);
	} catch (ex) {
		console.log(ex);
		res.send(500);
	}
});

app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
	res.status(404).json({ error: 'Route not found.' });
});

app.use((err, req, res, _next) => {
	console.error('Unhandled error:', err);
	res.status(500).json({ error: 'Something went wrong.' });
});

async function start() {
	try {
		await initDB();
		app.listen(port, () =>
			console.log(`🚀 Server running on http://localhost:${port}`),
		);
	} catch (err) {
		console.error('Failed to start server:', err);
		process.exit(1);
	}
}

start();
