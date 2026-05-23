import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMovieById } from '../data/movies.js';
import pool from '../db/pool.js';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

router.post('/', async (req, res) => {
	const { movieId, seatId } = req.body;

	if (!movieId || !seatId) {
		return res.status(400).json({ error: 'movieId and seatId are required.' });
	}

	// Validate movie exists (mock data check)
	const movie = getMovieById(movieId);
	if (!movie) {
		return res.status(404).json({ error: 'Movie not found.' });
	}

	const conn = await pool.connect();
	try {
		await conn.query('BEGIN');

		// Lock the seat row to prevent concurrent bookings
		const seatResult = await conn.query(
			'SELECT * FROM seats WHERE id = $1 FOR UPDATE',
			[seatId],
		);

		if (seatResult.rowCount === 0) {
			await conn.query('ROLLBACK');
			return res.status(404).json({ error: 'Seat not found.' });
		}

		// Check if seat is already booked for THIS movie
		const existingBooking = await conn.query(
			'SELECT id FROM bookings WHERE seat_id = $1 AND movie_id = $2',
			[seatId, movieId],
		);

		if (existingBooking.rowCount > 0) {
			await conn.query('ROLLBACK');
			return res
				.status(409)
				.json({ error: 'Seat is already booked for this movie.' });
		}

		// Check if user already has a booking for this movie
		const userBooking = await conn.query(
			'SELECT id FROM bookings WHERE user_id = $1 AND movie_id = $2',
			[req.user.id, movieId],
		);

		if (userBooking.rowCount > 0) {
			await conn.query('ROLLBACK');
			return res
				.status(409)
				.json({ error: 'You have already booked a seat for this movie.' });
		}

		// Create the booking
		const { rows } = await conn.query(
			`INSERT INTO bookings (user_id, seat_id, movie_id)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, seat_id, movie_id, booked_at`,
			[req.user.id, seatId, movieId],
		);

		// Update seat's name field with the user's name (preserves original schema intent)
		await conn.query('UPDATE seats SET name = $1 WHERE id = $2', [
			req.user.name,
			seatId,
		]);

		await conn.query('COMMIT');

		return res.status(201).json({
			message: 'Seat booked successfully.',
			booking: {
				...rows[0],
				movie: movie.title,
				bookedBy: req.user.name,
			},
		});
	} catch (err) {
		await conn.query('ROLLBACK');
		console.error('Booking error:', err.message);
		return res.status(500).json({ error: 'Internal server error.' });
	} finally {
		conn.release();
	}
});

router.get('/my', async (req, res) => {
	try {
		const { rows } = await pool.query(
			`SELECT b.id, b.movie_id, b.seat_id, b.booked_at
       FROM bookings b
       WHERE b.user_id = $1
       ORDER BY b.booked_at DESC`,
			[req.user.id],
		);

		const bookings = rows.map((b) => {
			const movie = getMovieById(b.movie_id);
			return {
				...b,
				movieTitle: movie ? movie.title : 'Unknown',
			};
		});

		res.json({ bookings });
	} catch (err) {
		console.error('My bookings error:', err.message);
		res.status(500).json({ error: 'Internal server error.' });
	}
});

router.delete('/:bookingId', async (req, res) => {
	const conn = await pool.connect();
	try {
		await conn.query('BEGIN');

		// Confirm the booking belongs to the logged-in user
		const { rows } = await conn.query(
			'SELECT * FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE',
			[req.params.bookingId, req.user.id],
		);

		if (rows.length === 0) {
			await conn.query('ROLLBACK');
			return res.status(404).json({ error: 'Booking not found or not yours.' });
		}

		const booking = rows[0];

		// Delete the booking record
		await conn.query('DELETE FROM bookings WHERE id = $1', [booking.id]);

		// Free the seat (reset name and isbooked only if no other booking holds it)
		const otherBookings = await conn.query(
			'SELECT id FROM bookings WHERE seat_id = $1',
			[booking.seat_id],
		);

		if (otherBookings.rowCount === 0) {
			await conn.query(
				'UPDATE seats SET isbooked = 0, name = NULL WHERE id = $1',
				[booking.seat_id],
			);
		}

		await conn.query('COMMIT');

		return res.json({ message: 'Booking cancelled successfully.' });
	} catch (err) {
		await conn.query('ROLLBACK');
		console.error('Cancel booking error:', err.message);
		return res.status(500).json({ error: 'Internal server error.' });
	} finally {
		conn.release();
	}
});

export default router;
