import pool from './pool.js';

export async function initDB() {
	const client = await pool.connect();
	try {
		await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id        SERIAL PRIMARY KEY,
        name      VARCHAR(255) NOT NULL,
        email     VARCHAR(255) UNIQUE NOT NULL,
        password  VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

		await client.query(`
      CREATE TABLE IF NOT EXISTS seats (
        id       SERIAL PRIMARY KEY,
        name     VARCHAR(255),
        isbooked INT DEFAULT 0
      );
    `);

		const { rowCount } = await client.query('SELECT 1 FROM seats LIMIT 1');
		if (rowCount === 0) {
			await client.query(
				'INSERT INTO seats (isbooked) SELECT 0 FROM generate_series(1, 20)',
			);
			console.log('✅ Seeded 20 seats.');
		}

		await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id         SERIAL PRIMARY KEY,
        user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seat_id    INT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
        movie_id   VARCHAR(50) NOT NULL,
        booked_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(seat_id, movie_id)   -- prevent duplicate seat bookings per movie
      );
    `);

		console.log('✅ Database tables ready.');
	} finally {
		client.release();
	}
}
