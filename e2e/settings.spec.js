import { test } from './fixtures/test-fixtures'

test.describe('Settings smoke', () => {
  test.beforeEach(({ backofficeCredentials }) => {
    const { userEmail, userPassword } = backofficeCredentials
    test.skip(!userEmail || !userPassword, 'Missing BACKOFFICE_E2E credentials in .env.local')
  })

  test('user can access settings page', async ({
    settingsPage,
    backofficeCredentials,
    backofficeSession
  }) => {
    await backofficeSession.loginAsCommuneUser()
    await settingsPage.goto()
    await settingsPage.expectLoaded()
    await settingsPage.expectCommuneContextVisible(backofficeCredentials.communeName)
  })
})
