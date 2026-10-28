/**
 * Series slots for the compare lines, bright enough for the black showroom
 * (Apple's dark-mode system orange, cyan, pink, green). Blue stays the action
 * color, so no series is blue.
 *
 * This lives outside the "use client" chart module on purpose: a server
 * component that imports a plain value from a client module gets a reference
 * proxy, not the array, and every swatch silently loses its color.
 */
export const SERIES_COLORS = ["#ff9f0a", "#64d2ff", "#ff6482", "#30d158"];
