import { expect } from '@playwright/test'

export class ReservationsSallesPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page
    this.title = page.getByRole('heading', { name: 'Planning des réservations' })
  }

  async goto() {
    await this.page.goto('/reservations-salles')
    await expect(this.page).toHaveURL(/\/reservations-salles$/)
  }

  async expectLoaded() {
    await expect(this.title).toBeVisible()
  }

  async expectCommuneContextVisible(communeName) {
    if (!communeName) return
    await expect(this.page.getByText(communeName).first()).toBeVisible()
  }
}
