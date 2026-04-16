import { expect } from '@playwright/test'

export class ActualitesPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page
    this.title = page.getByRole('heading', { name: 'Actualités' })
  }

  async goto() {
    await this.page.goto('/actualites')
    await expect(this.page).toHaveURL(/\/actualites$/)
  }

  async expectLoaded() {
    await expect(this.title).toBeVisible()
  }

  async expectCommuneContextVisible(communeName) {
    if (!communeName) return
    await expect(this.page.getByText(communeName).first()).toBeVisible()
  }
}
