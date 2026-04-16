import { expect } from '@playwright/test'

export class SettingsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page
    this.title = page.getByRole('heading', { name: 'Paramètres' })
    this.profileTitle = page.getByText('Profil', { exact: true })
  }

  async goto() {
    await this.page.goto('/settings')
    await expect(this.page).toHaveURL(/\/settings$/)
  }

  async expectLoaded() {
    await expect(this.title).toBeVisible()
    await expect(this.profileTitle).toBeVisible()
  }

  async expectCommuneContextVisible(communeName) {
    if (!communeName) return
    await expect(this.page.getByText(communeName).first()).toBeVisible()
  }
}
