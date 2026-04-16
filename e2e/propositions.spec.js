import { test } from './fixtures/test-fixtures'

test.describe('Propositions smoke', () => {
  test.beforeEach(({ backofficeCredentials }) => {
    const { userEmail, userPassword } = backofficeCredentials
    test.skip(!userEmail || !userPassword, 'Missing BACKOFFICE_E2E credentials in .env.local')
  })

  test('user can access propositions page', async ({
    propositionsPage,
    backofficeCredentials,
    backofficeSession
  }) => {
    await backofficeSession.loginAsCommuneUser()
    await propositionsPage.goto()
    await propositionsPage.expectLoaded()
    await propositionsPage.expectCommuneContextVisible(backofficeCredentials.communeName)
  })
})
