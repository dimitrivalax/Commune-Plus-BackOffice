import { expect } from '@playwright/test'

export class SignalementsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page
    this.title = page.getByRole('heading', { name: 'Signalements' })
  }

  async goto() {
    await this.page.goto('/signalements')
    await expect(this.page).toHaveURL(/\/signalements$/)
  }

  async expectLoaded() {
    await expect(this.title).toBeVisible()
  }

  async expectCommuneContextVisible(communeName) {
    if (!communeName) return
    await expect(this.page.getByText(communeName).first()).toBeVisible()
  }
}
