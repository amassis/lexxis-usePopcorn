import { useEffect } from "react";

export function useKey(key, action) {
	useEffect(
		function () {
			// callback function for the listener
			const callback = function (e) {
				if (e.code === key) {
					action();
				}
			};

			// listen to key strokes
			document.addEventListener("keydown", callback);

			// cleanup function - removes the listener after unmount
			return function () {
				document.removeEventListener("keydown", callback);
			};
		},

		// triggers this effect on mount AND if the onCloseMovie prop changes
		[action, key],
	);
}
