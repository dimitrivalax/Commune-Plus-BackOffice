import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    channel: 'chrome',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: {
    command: 'pnpm build && pnpm preview --port 3000 --host 127.0.0.1',
    url: 'http://127.0.0.1:3000/login',
    reuseExistingServer: true,
    timeout: 300000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
