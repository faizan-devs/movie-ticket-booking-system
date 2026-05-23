import { Router } from 'express';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

const router = Router();

router.post('/register', async (req, res) => {
	try {
		const { name, email, password } = req.body;

		// Basic validation
		if (!name || !email || !password) {
			return res
				.status(400)
				.json({ error: 'name, email and password are required.' });
		}

		if (password.length < 6) {
			return res
				.status(400)
				.json({ error: 'Password must be at least 6 characters.' });
		}

		// Check for duplicate email
		const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
			email.toLowerCase(),
		]);
		if (existing.rowCount > 0) {
			return res
				.status(409)
				.json({ error: 'An account with this email already exists.' });
		}

		// Hash password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		// Insert user
		const { rows } = await pool.query(
			`INSERT INTO users (name, email, password)
        	VALUES ($1, $2, $3)
            RETURNING id, name, email, created_at`,
			[name.trim(), email.toLowerCase().trim(), hashedPassword],
		);

		const user = rows[0];
		const token = signToken(user);

		return res.status(201).json({
			message: 'Registration successful.',
			token,
			user: { id: user.id, name: user.name, email: user.email },
		});
	} catch (err) {
		console.error('Register error:', err.message);
		return res.status(500).json({ error: 'Internal server error.' });
	}
});

router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res
				.status(400)
				.json({ error: 'email and password are required.' });
		}

		// Find user
		const { rows } = await pool.query(
			'SELECT id, name, email, password FROM users WHERE email = $1',
			[email.toLowerCase()],
		);

		if (rows.length === 0) {
			return res.status(401).json({ error: 'Invalid email or password.' });
		}

		const user = rows[0];

		// Verify password
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(401).json({ error: 'Invalid email or password.' });
		}

		const token = signToken(user);

		return res.json({
			message: 'Login successful.',
			token,
			user: { id: user.id, name: user.name, email: user.email },
		});
	} catch (err) {
		console.error('Login error:', err.message);
		return res.status(500).json({ error: 'Internal server error.' });
	}
});

import { authenticate } from '../middleware/auth.js';

router.get('/me', authenticate, async (req, res) => {
	try {
		const { rows } = await pool.query(
			'SELECT id, name, email, created_at FROM users WHERE id = $1',
			[req.user.id],
		);

		if (rows.length === 0) {
			return res.status(404).json({ error: 'User not found.' });
		}

		return res.json({ user: rows[0] });
	} catch (err) {
		console.error('Me error:', err.message);
		return res.status(500).json({ error: 'Internal server error.' });
	}
});

function signToken(user) {
	return jwt.sign(
		{ id: user.id, name: user.name, email: user.email },
		process.env.JWT_SECRET || 'secret',
		{ expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
	);
}

export default router;
