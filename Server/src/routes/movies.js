import { Router } from 'express';
import { getAllMovies, getMovieById } from '../data/movies.js';
import { authenticate } from '../middleware/auth.js';
import pool from '../db/pool.js';

const router = Router();

router.get('/', (req, res) => {
	res.json({ movies: getAllMovies() });
});

router.get('/:movieId', (req, res) => {
	const movie = getMovieById(req.params.movieId);
	if (!movie) {
		return res.status(404).json({ error: 'Movie not found.' });
	}
	res.json({ movie });
});

router.get('/:movieId/seats', authenticate, async (req, res) => {
	try {
		const movie = getMovieById(req.params.movieId);
		if (!movie) {
			return res.status(404).json({ error: 'Movie not found.' });
		}

		const seatsResult = await pool.query('SELECT * FROM seats ORDER BY id');

		const bookingsResult = await pool.query(
			`SELECT b.seat_id, u.name AS booked_by
       	    FROM bookings b
            JOIN users u ON u.id = b.user_id
            WHERE b.movie_id = $1`,
			[req.params.movieId],
		);

		const bookedMap = {};
		for (const row of bookingsResult.rows) {
			bookedMap[row.seat_id] = row.booked_by;
		}

		const seats = seatsResult.rows.map((seat) => ({
			id: seat.id,
			isbooked: bookedMap[seat.id] ? 1 : 0,
			bookedBy: bookedMap[seat.id] || null,
		}));

		res.json({ movie, seats });
	} catch (err) {
		console.error('Seats fetch error:', err.message);
		res.status(500).json({ error: 'Internal server error.' });
	}
});

export default router;
