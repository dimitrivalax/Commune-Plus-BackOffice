export const useFacebookPublishingEnabled = () => {
  const config = useRuntimeConfig()
  return computed(() => config.public.facebookPublishingEnabled !== false)
}
