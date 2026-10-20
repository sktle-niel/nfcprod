/**
 * How long the map gets to show up before the order goes on without it. One patience for both things the customer
 * waits for: the map's code to arrive, and its first tile. A free outside service must never hold an order, and
 * neither may a slow connection.
 */
export const MAP_PATIENCE_MS = 15_000
