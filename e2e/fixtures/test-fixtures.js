import { test as base, expect } from '@playwright/test'
import { LoginPage } from '../pages/login-page'
import { ActualitesPage } from '../pages/actualites-page'
import { SignalementsPage } from '../pages/signalements-page'
import { PropositionsPage } from '../pages/propositions-page'
import { ReservationsSallesPage } from '../pages/reservations-salles-page'
import { SettingsPage } from '../pages/settings-page'

const userEmail = process.env.BACKOFFICE_E2E_EMAIL
const userPassword = process.env.BACKOFFICE_E2E_PASSWORD
const communeName = process.env.BACKOFFICE_E2E_COMMUNE_NAME

export const test = base.extend({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },
  actualitesPage: async ({ page }, use) => {
    await use(new ActualitesPage(page))
  },
  signalementsPage: async ({ page }, use) => {
    await use(new SignalementsPage(page))
  },
  propositionsPage: async ({ page }, use) => {
    await use(new PropositionsPage(page))
  },
  reservationsSallesPage: async ({ page }, use) => {
    await use(new ReservationsSallesPage(page))
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page))
  },
  backofficeCredentials: async ({ browserName }, use) => {
    void browserName
    await use({
      userEmail,
      userPassword,
      communeName
    })
  },
  backofficeSession: async ({ loginPage, backofficeCredentials }, use) => {
    const { userEmail, userPassword } = backofficeCredentials
    await use({
      loginAsCommuneUser: async () => {
        await loginPage.goto()
        await loginPage.login(userEmail, userPassword)
      }
    })
  }
})

export { expect }
