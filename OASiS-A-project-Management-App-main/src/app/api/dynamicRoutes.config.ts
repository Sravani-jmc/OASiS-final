// This file defines routes that should be dynamic and excluded from static generation
// Used for NextJS's dynamic data fetching strategies

export const dynamicRoutes = [
  '/api/invitations/count',
  '/api/users/profile',
  // Add other routes that use dynamic data fetching here
];

export const isDynamicRoute = (path: string) => {
  return dynamicRoutes.includes(path);
}; 