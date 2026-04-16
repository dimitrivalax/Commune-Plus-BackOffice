import { expect } from '@playwright/test'

export class PropositionsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page
    this.title = page.getByRole('heading', { name: 'Propositions' })
  }

  async goto() {
    await this.page.goto('/propositions')
    await expect(this.page).toHaveURL(/\/propositions$/)
  }

  async expectLoaded() {
    await expect(this.title).toBeVisible()
  }

  async expectCommuneContextVisible(communeName) {
    if (!communeName) return
    await expect(this.page.getByText(communeName).first()).toBeVisible()
  }
}
