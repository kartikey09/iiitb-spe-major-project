// Central API base URL
// We now use relative paths (empty string) because Nginx acts as a reverse proxy
// to route /api/* requests directly to the backend service inside the cluster.
export const API_BASE = '';
