import { test } from './fixtures/test-fixtures'

test.describe('BackOffice auth and commune access', () => {
  test.beforeEach(({ backofficeCredentials }) => {
    const { userEmail, userPassword } = backofficeCredentials
    test.skip(!userEmail || !userPassword, 'Missing BACKOFFICE_E2E credentials in .env')
  })

  test('user can login and access commune backoffice pages', async ({
    actualitesPage,
    backofficeCredentials,
    backofficeSession
  }) => {
    const { communeName } = backofficeCredentials

    await backofficeSession.loginAsCommuneUser()

    await actualitesPage.expectCommuneContextVisible(communeName)
    await actualitesPage.goto()
    await actualitesPage.expectLoaded()
    await actualitesPage.expectCommuneContextVisible(communeName)
  })
})
