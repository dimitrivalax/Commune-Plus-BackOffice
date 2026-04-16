import { test } from './fixtures/test-fixtures'

test.describe('Reservations salles smoke', () => {
  test.beforeEach(({ backofficeCredentials }) => {
    const { userEmail, userPassword } = backofficeCredentials
    test.skip(!userEmail || !userPassword, 'Missing BACKOFFICE_E2E credentials in .env.local')
  })

  test('user can access reservations salles page', async ({
    reservationsSallesPage,
    backofficeCredentials,
    backofficeSession
  }) => {
    await backofficeSession.loginAsCommuneUser()
    await reservationsSallesPage.goto()
    await reservationsSallesPage.expectLoaded()
    await reservationsSallesPage.expectCommuneContextVisible(backofficeCredentials.communeName)
  })
})
