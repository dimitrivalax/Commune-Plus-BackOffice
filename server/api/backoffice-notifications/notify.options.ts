const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

export default defineEventHandler((event) => {
  setResponseHeaders(event, corsHeaders)
  setResponseStatus(event, 204)
  return null
})
