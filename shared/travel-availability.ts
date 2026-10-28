// Supplier permission must be resolved before re-enabling flight search.
// Keep this independent from credentials and fail closed on both client and server.
export const flightSearchEnabled: boolean = false;
