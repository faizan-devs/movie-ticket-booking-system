const API = 'http://localhost:8080';
let token = localStorage.getItem('bmt_token');
let user = JSON.parse(localStorage.getItem('bmt_user') || 'null');
let selectedSeat = null;
let currentMovie = null;

// Pages that use auth-page-wrap layout vs regular page layout
const AUTH_PAGES = ['auth', 'register'];

window.onload = () => {
	if (token && user) {
		setLoggedIn();
		showPage('movies');
	} else showPage('auth');
};

function goHome() {
	if (token) showPage('movies');
	else showPage('auth');
}

function showPage(name) {
	// Hide all pages
	document
		.querySelectorAll('.page, .auth-page-wrap')
		.forEach((p) => p.classList.remove('active'));
	const el = document.getElementById(name + '-page');
	if (el) el.classList.add('active');
	// Clear errors when switching auth pages
	if (name === 'auth') {
		clearError('login-error');
	}
	if (name === 'register') {
		clearError('reg-error');
	}
	// Load data
	if (name === 'movies') loadMovies();
	if (name === 'my-bookings') loadMyBookings();
	// Scroll to top
	window.scrollTo(0, 0);
}

function clearError(id) {
	const el = document.getElementById(id);
	if (el) {
		el.textContent = '';
		el.classList.remove('visible');
	}
}

function showError(id, msg) {
	const el = document.getElementById(id);
	if (el) {
		el.textContent = msg;
		el.classList.add('visible');
	}
}

function clearForm(ids) {
	ids.forEach((id) => {
		const el = document.getElementById(id);
		if (el) el.value = '';
	});
}

function setLoggedIn() {
	document.getElementById('user-info').textContent = user.name;
	document.getElementById('user-info').classList.add('visible');
	document.getElementById('my-bookings-btn').style.display = 'block';
	document.getElementById('logout-btn').style.display = 'block';
	document.getElementById('login-nav-btn').style.display = 'none';
}

function setLoggedOut() {
	token = null;
	user = null;
	localStorage.removeItem('bmt_token');
	localStorage.removeItem('bmt_user');
	document.getElementById('user-info').classList.remove('visible');
	document.getElementById('my-bookings-btn').style.display = 'none';
	document.getElementById('logout-btn').style.display = 'none';
	document.getElementById('login-nav-btn').style.display = 'block';
}

function logout() {
	setLoggedOut();
	clearForm(['login-email', 'login-password']);
	showPage('auth');
	toast('Logged out successfully');
}

async function doLogin() {
	const email = document.getElementById('login-email').value.trim();
	const password = document.getElementById('login-password').value;
	if (!email || !password)
		return showError('login-error', 'Please fill in all fields.');
	try {
		const res = await fetch(`${API}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
		});
		const data = await res.json();
		if (!res.ok) return showError('login-error', data.error || 'Login failed.');
		token = data.token;
		user = data.user;
		localStorage.setItem('bmt_token', token);
		localStorage.setItem('bmt_user', JSON.stringify(user));
		clearForm(['login-email', 'login-password']);
		setLoggedIn();
		showPage('movies');
		toast(`Welcome back, ${user.name}!`);
	} catch (e) {
		showError('login-error', 'Could not connect to server.');
	}
}

async function doRegister() {
	const name = document.getElementById('reg-name').value.trim();
	const email = document.getElementById('reg-email').value.trim();
	const password = document.getElementById('reg-password').value;
	if (!name || !email || !password)
		return showError('reg-error', 'Please fill in all fields.');
	try {
		const res = await fetch(`${API}/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, email, password }),
		});
		const data = await res.json();
		if (!res.ok)
			return showError('reg-error', data.error || 'Registration failed.');
		token = data.token;
		user = data.user;
		localStorage.setItem('bmt_token', token);
		localStorage.setItem('bmt_user', JSON.stringify(user));
		clearForm(['reg-name', 'reg-email', 'reg-password']);
		setLoggedIn();
		showPage('movies');
		toast(`Welcome, ${user.name}!`);
	} catch (e) {
		showError('reg-error', 'Could not connect to server.');
	}
}

async function loadMovies() {
	const grid = document.getElementById('movies-grid');
	grid.innerHTML = '<div class="spinner"></div>';
	const res = await fetch(`${API}/movies`);
	const data = await res.json();
	document.getElementById('movie-count').textContent =
		`${data.movies.length} films`;
	grid.innerHTML = data.movies
		.map(
			(m) => `
    <div class="movie-card" onclick="openBooking('${m.id}')">
      <div class="movie-id">${m.id}</div>
      <div class="movie-title">${m.title}</div>
      <div class="movie-meta">
        <span class="tag accent">${m.releaseYear}</span>
        <span class="tag">${m.duration}</span>
        <span class="tag">${m.rating}</span>
        <span class="tag">${m.language}</span>
      </div>
      <div class="movie-director">Dir. <strong>${m.director}</strong></div>
      <div class="book-arrow">&#8599;</div>
    </div>`,
		)
		.join('');
}

async function openBooking(movieId) {
	if (!token) {
		showPage('auth');
		toast('Please login to book seats', true);
		return;
	}
	showPage('booking');
	selectedSeat = null;
	document.getElementById('sum-seat').textContent = '—';
	document.getElementById('confirm-btn').classList.remove('ready');
	document.getElementById('seats-grid').innerHTML =
		'<div class="spinner"></div>';
	const res = await fetch(`${API}/movies/${movieId}/seats`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	const data = await res.json();
	currentMovie = data.movie;
	document.getElementById('sum-movie').textContent = currentMovie.title;
	document.getElementById('sum-duration').textContent = currentMovie.duration;
	document.getElementById('sum-lang').textContent = currentMovie.language;
	document.getElementById('sum-rating').textContent = currentMovie.rating;
	document.getElementById('seats-grid').innerHTML = data.seats
		.map(
			(s) => `
    <div class="seat ${s.isbooked ? 'booked' : ''}" id="seat-${s.id}"
      onclick="${s.isbooked ? '' : `selectSeat(${s.id})`}"
      title="${s.isbooked ? 'Booked by ' + (s.bookedBy || 'someone') : 'Seat ' + s.id}"
    >${s.id}</div>`,
		)
		.join('');
}

function selectSeat(seatId) {
	if (selectedSeat)
		document
			.getElementById('seat-' + selectedSeat)
			?.classList.remove('selected');
	selectedSeat = seatId;
	document.getElementById('seat-' + seatId).classList.add('selected');
	document.getElementById('sum-seat').textContent = '#' + seatId;
	document.getElementById('confirm-btn').classList.add('ready');
}

async function confirmBooking() {
	if (!selectedSeat || !currentMovie) return;
	const btn = document.getElementById('confirm-btn');
	btn.textContent = 'BOOKING...';
	btn.classList.remove('ready');
	const res = await fetch(`${API}/bookings`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			movieId: currentMovie.id,
			seatId: selectedSeat,
		}),
	});
	const data = await res.json();
	btn.textContent = 'CONFIRM BOOKING';
	if (!res.ok) {
		toast(data.error || 'Booking failed', true);
		btn.classList.add('ready');
		return;
	}
	toast(`Seat #${selectedSeat} booked for ${currentMovie.title}!`);
	openBooking(currentMovie.id);
}

async function loadMyBookings() {
	const container = document.getElementById('bookings-container');
	container.innerHTML = '<div class="spinner"></div>';
	const res = await fetch(`${API}/bookings/my`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	const data = await res.json();
	if (!data.bookings || data.bookings.length === 0) {
		container.innerHTML = `
      <div class="empty-state">
        <span class="big">NO TICKETS YET</span>
        <p style="margin-bottom:24px">You haven't booked any seats yet.</p>
        <button class="btn" onclick="showPage('movies')">BROWSE MOVIES</button>
      </div>`;
		return;
	}
	container.innerHTML =
		`<div class="bookings-list">` +
		data.bookings
			.map(
				(b, i) => `
    <div class="booking-row" style="animation-delay:${i * 0.05}s">
      <div>
        <div class="booking-movie">${b.movieTitle}</div>
        <div class="booking-meta">SEAT #${b.seat_id} &nbsp;&middot;&nbsp; ${new Date(b.booked_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      <button class="btn danger" onclick="cancelBooking(${b.id}, this)">CANCEL</button>
    </div>`,
			)
			.join('') +
		`</div>`;
}

async function cancelBooking(bookingId, btn) {
	btn.textContent = '...';
	const res = await fetch(`${API}/bookings/${bookingId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` },
	});
	const data = await res.json();
	if (!res.ok) {
		toast(data.error || 'Failed to cancel', true);
		btn.textContent = 'CANCEL';
		return;
	}
	toast('Booking cancelled');
	loadMyBookings();
}

let toastTimer;
function toast(msg, isError = false) {
	const el = document.getElementById('toast');
	el.textContent = msg;
	el.className = 'show' + (isError ? ' error' : '');
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => (el.className = ''), 3000);
}

document.addEventListener('keydown', (e) => {
	if (e.key !== 'Enter') return;
	const activePage = document.querySelector('.auth-page-wrap.active');
	if (!activePage) return;
	if (activePage.id === 'auth-page') doLogin();
	else if (activePage.id === 'register-page') doRegister();
});
