// Middleware pour ignorer les requêtes webpack-hmr et éviter les warnings Vue Router
export default defineNuxtRouteMiddleware((to) => {
  // Ignorer les chemins webpack-hmr qui ne devraient pas passer par Vue Router
  if (to.path.startsWith('/_next/') || to.path.includes('webpack-hmr')) {
    return abortNavigation()
  }
})
