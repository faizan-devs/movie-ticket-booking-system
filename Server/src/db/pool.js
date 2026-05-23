import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

const pool = process.env.DATABASE_URL
	? new Pool({
			connectionString: process.env.DATABASE_URL,
			ssl: isProduction
				? {
						rejectUnauthorized: false,
					}
				: false,
		})
	: new Pool({
			host: process.env.DB_HOST || 'localhost',
			port: Number(process.env.DB_PORT) || 5432,
			user: process.env.DB_USER || 'postgres',
			password: process.env.DB_PASSWORD || 'postgres',
			database: process.env.DB_NAME || 'bmt_user',
			max: 20,
			connectionTimeoutMillis: 0,
			idleTimeoutMillis: 0,
		});

pool.on('error', (err) => {
	console.error('Unexpected pool error:', err.message);
});

export default pool;
