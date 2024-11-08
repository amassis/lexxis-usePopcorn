import { useState, useEffect, useRef, useCallback } from "react";
import StarRating from "./StarRating";
import { useMovies } from "./useMovies";
import { useLocalStoragestate } from "./useLocalStorageState";
import { useKey } from "./useKey";

// OMDB Key
const OMDB_KEY = "af2eaa9a";

// Function to calculate the average of elements in an array
const average = (arr) => arr.reduce((acc, cur, i, arr) => acc + cur / arr.length, 0);

export default function App() {
	const [query, setQuery] = useState("");
	const [selectedId, setSelectedId] = useState(null);
	// const [watched, setWatched] = useState([]);
	// const [watched, setWatched] = useState(function () {
	// 	const storedValue = JSON.parse(localStorage.getItem("watched"));
	// 	return storedValue;
	// });

	const [watched, setWatched] = useLocalStoragestate([], "watched");

	const handleSelectMovie = function (id) {
		setSelectedId(() => (id === selectedId ? null : id));
	};

	// handleCloseMovie is passed as parameter in useMovies.
	// There, it is in the dependency array
	// To avoid all re-renders to re-declare handleCloseMovie and trigger useMovies in an infinite loop, we declare it using useCallback.
	//This way it will only trigger a re-render if it actually changes.
	const handleCloseMovie = useCallback(
		function () {
			setSelectedId(null);
		},
		[setSelectedId],
	);

	const handleAddWatched = function (movie) {
		setWatched((watched) => [...watched, movie]);
	};

	const handleDeleteWatched = function (id) {
		setWatched((watched) => watched.filter((movie) => movie.imdbID !== id));
	};

	const { isLoading, movies, error } = useMovies(query, handleCloseMovie);

	return (
		<>
			<NavBar>
				<Logo />
				<Search query={query} setQuery={setQuery} />
				<NumResults movies={movies} />
			</NavBar>
			<Main>
				<Box>
					{isLoading && <Loader />}
					{!isLoading && !error && <MovieList onSelectMovie={handleSelectMovie} movies={movies} />}
					{error && <ErrorMessage message={error} />}
				</Box>
				<Box>
					{selectedId ? (
						<MovieDetails
							onCloseMovie={handleCloseMovie}
							selectedId={selectedId}
							onAddWatched={handleAddWatched}
							watched={watched}
						/>
					) : (
						<>
							<WatchedSummary watched={watched} />
							<WatchedMovieList watched={watched} onDeleteWatched={handleDeleteWatched} />
						</>
					)}
				</Box>
			</Main>
		</>
	);
}

function Loader() {
	return <p className="loader">Loading...</p>;
}

function ErrorMessage({ message }) {
	return (
		<p className="error">
			<span>🧨 {message}</span>
		</p>
	);
}
function NavBar({ children }) {
	return <nav className="nav-bar">{children}</nav>;
}

function Logo() {
	return (
		<div className="logo">
			<span role="img">🍿</span>
			<h1>usePopcorn</h1>
		</div>
	);
}

function Search({ query, setQuery }) {
	const inputEl = useRef(null);

	const handleEnter = function () {
		if (document.activeElement === inputEl.current) return;
		inputEl.current.focus();
		setQuery("");
	};

	useKey("Enter", handleEnter);

	return (
		<input
			className="search"
			type="text"
			placeholder="Search movies..."
			value={query}
			onChange={(e) => setQuery(e.target.value)}
			ref={inputEl}
		/>
	);
}

function NumResults({ movies }) {
	return (
		<p className="num-results">
			Found <strong>{movies.length}</strong> results
		</p>
	);
}

function Main({ children }) {
	return <main className="main">{children}</main>;
}

function Box({ children }) {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<div className="box">
			<button className="btn-toggle" onClick={() => setIsOpen((open) => !open)}>
				{isOpen ? "–" : "+"}
			</button>
			{isOpen && children}
		</div>
	);
}

function MovieList({ onSelectMovie, movies }) {
	return (
		<ul className="list list-movies">
			{movies?.map((movie) => (
				<Movie onSelectMovie={onSelectMovie} movie={movie} key={movie.imdbID} />
			))}
		</ul>
	);
}

function Movie({ onSelectMovie, movie }) {
	return (
		<li onClick={() => onSelectMovie(movie.imdbID)}>
			<img src={movie.Poster} alt={`${movie.Title} poster`} />
			<h3>{movie.Title}</h3>
			<div>
				<p>
					<span>🗓</span>
					<span>{movie.Year}</span>
				</p>
			</div>
		</li>
	);
}

function MovieDetails({ onCloseMovie, onAddWatched, selectedId, watched }) {
	const [movie, setMovie] = useState({});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [userRating, setUserRating] = useState(0);

	const countRatingDecision = useRef(0);
	useEffect(function () {
		if (userRating) countRatingDecision.current++;
	});

	// deconstruct movie, "translating" weird capitalized properties from the API results into "normal" properties
	const {
		Title: title,
		Year: year,
		Plot: plot,
		Poster: poster,
		Runtime: runtime,
		imdbRating,
		Released: released,
		Actors: actors,
		Director: director,
		Genre: genre,
	} = movie;

	// loads the userRating for the movie, in case it has been watched
	// if it hasn't been watched, will be zero (initial value)
	const watchedUserRating = watched.reduce((acc, movie) => (movie.imdbID === selectedId ? movie.userRating : acc), 0);

	const handleAdd = function () {
		const newWatchedMovie = {
			imdbID: selectedId,
			title,
			year,
			poster,
			runtime: +runtime.split(" ").at(0),
			imdbRating: +imdbRating,
			userRating,
			countRatingDecision: countRatingDecision.current,
		};

		onAddWatched(newWatchedMovie);

		// After movie is added to the Watched list, close the movie details and go back to the watched list & summary
		onCloseMovie();
	};

	useEffect(
		function () {
			async function getMovieDetails() {
				try {
					setIsLoading(true);
					setError("");

					// Call OMDB to fetch the selected movie
					const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${selectedId}`);

					// If Fetch didn't return valid results throw error
					if (!res.ok) throw new Error("Something went wrong while fetching movie details");

					const data = await res.json();

					// data.Response is "False" when movie was not found
					// This shouldn't happen, as we're searching with imdbID, but I put it just as a safety measure
					if (data.Response === "False") throw new Error("Movie not found");

					setMovie(data);
					setError("");
				} catch (err) {
					console.error("Error: ", err.message);
					setError(err.message);
				} finally {
					setIsLoading(false);
				}
			}
			// Actually call the function to get the selected movie details
			getMovieDetails();
		},
		// triggers the effect on mount AND whenever selectedId or watched are changed
		[selectedId, watched],
	);

	useEffect(
		function () {
			// if a title has not yet been defined (first render) - return
			if (!title) return;

			// sets BrowserTab Title to the Movie title
			document.title = `Movie | ${title}`;

			// cleanUp function - when component no longer mounted (movie was closed), go back to original name
			return () => (document.title = "usePopcorn");
		},

		// triggers this effect on mount AND whenever the title changes
		[title],
	);

	useKey("Escape", onCloseMovie);

	return (
		<div className="details">
			{error && <ErrorMessage message={error} />}

			{!isLoading && !error && (
				<>
					<header>
						<button onClick={onCloseMovie} className="btn btn-back">
							&larr;
						</button>
						<img src={poster} alt={`Poster of ${title}`} />
						<div className="details-overview">
							<h2>{title}</h2>
							<p>
								{released} &bull; {runtime}
							</p>
							<p>{genre}</p>
							<p>
								<span>⭐️</span>
								{imdbRating} IMDb rating
							</p>
						</div>
					</header>
					<section>
						<div className="rating">
							{/* watchedUserRating is zero when the user has not yet rated/added to the list */}
							{watchedUserRating > 0 ? (
								<p>You rated this movie {watchedUserRating} ⭐️</p>
							) : (
								<>
									{" "}
									<StarRating maxRating={10} size={24} onSetRating={setUserRating} />
									{userRating > 0 ? (
										<button className="btn-add" onClick={handleAdd}>
											+ Add to list
										</button>
									) : null}
								</>
							)}
						</div>
						<p>
							<em>{plot}</em>
						</p>
						<p>Starring {actors}</p>
						<p>Directed by {director}</p>
					</section>
				</>
			)}
		</div>
	);
}

function WatchedSummary({ watched }) {
	const avgImdbRating = average(watched.map((movie) => movie.imdbRating));
	const avgUserRating = average(watched.map((movie) => movie.userRating));
	const avgRuntime = average(watched.map((movie) => movie.runtime));
	return (
		<div className="summary">
			<h2>Movies you watched</h2>
			<div>
				<p>
					<span>#️⃣</span>
					<span>{watched.length} movies</span>
				</p>
				<p>
					<span>⭐️</span>
					<span>{avgImdbRating.toFixed(1)}</span>
				</p>
				<p>
					<span>🌟</span>
					<span>{avgUserRating.toFixed(1)}</span>
				</p>
				<p>
					<span>⏳</span>
					<span>{avgRuntime.toFixed(0)} min</span>
				</p>
			</div>
		</div>
	);
}

function WatchedMovieList({ watched, onDeleteWatched }) {
	return (
		<ul className="list">
			{watched.map((movie) => (
				<WatchedMovie movie={movie} key={movie.imdbID} onDeleteWatched={onDeleteWatched} />
			))}
		</ul>
	);
}

function WatchedMovie({ movie, onDeleteWatched }) {
	return (
		<li>
			<img src={movie.poster} alt={`${movie.title} poster`} />
			<h3>{movie.title}</h3>
			<div>
				<p>
					<span>⭐️</span>
					<span>{movie.imdbRating}</span>
				</p>
				<p>
					<span>🌟</span>
					<span>{movie.userRating}</span>
				</p>
				<p>
					<span>⏳</span>
					<span>{movie.runtime} min</span>
				</p>
				<button className="btn-delete" onClick={() => onDeleteWatched(movie.imdbID)}>
					❌
				</button>
			</div>
		</li>
	);
}
