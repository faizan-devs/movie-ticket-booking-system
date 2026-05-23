const movies = [
	{
		id: 'movie_001',
		title: 'Inception',
		genre: 'Sci-Fi / Thriller',
		duration: '2h 28m',
		rating: 'PG-13',
		releaseYear: 2010,
		director: 'Christopher Nolan',
		language: 'English',
		totalSeats: 20,
	},
	{
		id: 'movie_002',
		title: 'The Dark Knight',
		genre: 'Action / Crime',
		duration: '2h 32m',
		rating: 'PG-13',
		releaseYear: 2008,
		director: 'Christopher Nolan',
		language: 'English',
		totalSeats: 20,
	},
	{
		id: 'movie_003',
		title: 'Interstellar',
		genre: 'Sci-Fi / Adventure',
		duration: '2h 49m',
		rating: 'PG',
		releaseYear: 2014,
		director: 'Christopher Nolan',
		language: 'English',
		totalSeats: 20,
	},
	{
		id: 'movie_004',
		title: '3 Idiots',
		genre: 'Comedy / Drama',
		duration: '2h 50m',
		rating: 'PG',
		releaseYear: 2009,
		director: 'Rajkumar Hirani',
		language: 'Hindi',
		totalSeats: 20,
	},
	{
		id: 'movie_005',
		title: 'Dangal',
		genre: 'Biographical / Sports',
		duration: '2h 41m',
		rating: 'U',
		releaseYear: 2016,
		director: 'Nitesh Tiwari',
		language: 'Hindi',
		totalSeats: 20,
	},
	{
		id: 'movie_006',
		title: 'Avatar',
		genre: 'Sci-Fi / Action / Adventure',
		duration: '2h 42m',
		rating: 'PG',
		releaseYear: 2009,
		director: 'James Cameroon',
		language: 'English',
		totalSeats: 20,
	},
];

export function getAllMovies() {
	return movies;
}

export function getMovieById(id) {
	return movies.find((m) => m.id === id) || null;
}
