import { useState, useEffect } from "react";

// OMDB Key
const OMDB_KEY = "af2eaa9a";

export function useMovies(query, callback) {
	const [movies, setMovies] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(
		function () {
			// if callback is defined, call it.
			callback?.();

			// this controller will help kill the fetch events that accumulate due to the App rendering after every key pressed in the search (search is a state, so whenever it changes, the app re-renders and re-fetches)
			const controller = new AbortController();

			async function fetchMovies() {
				try {
					setIsLoading(true);
					setError("");

					// Call OMDB to fetch movies
					const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&s=${query}`, {
						// signal makes the fetch listen to the abort signal given by the cleanup function
						signal: controller.signal,
					});

					// If Fetch didn't return valid results throw error
					if (!res.ok) throw new Error("Something went wrong while fetching movies");

					const data = await res.json();

					// If data.Response is "False" that means the search didn't produce results
					if (data.Response === "False") throw new Error("Movie not found");

					setMovies(data.Search);
					setError("");
				} catch (err) {
					// AbortError refers to the cancellation of the previous fetch operations, it doesn't really interest us - not an actual error
					if (err.name !== "AbortError") {
						console.error(err.message);
						setError(err.message);
					}
				} finally {
					setIsLoading(false);
				}
			}

			// Prevents calling the fetchMovies function when we have less than 3 characters in the search bar
			if (query.length < 3) {
				setMovies([]);
				setError("");
				return;
			}

			// If we're running a new search, no reason for the last movie to remain open
			// moved to callback
			// handleCloseMovie();

			//call the fetchMovies function
			fetchMovies();

			// Cleanup function - abort the effect (fetch)
			return function () {
				controller.abort();
			};
		},
		// triggers this effect on mount AND whenever there is a change in the query state
		[query, callback],
	);
	return { isLoading, movies, error };
}
