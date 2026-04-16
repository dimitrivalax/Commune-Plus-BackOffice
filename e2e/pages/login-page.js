import { expect } from '@playwright/test'

export class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page
    this.emailInput = page.getByPlaceholder('votre.email@exemple.com')
    this.passwordInput = page.getByPlaceholder('••••••••')
    this.submitButton = page.getByRole('button', { name: 'Se connecter' })
  }

  async goto() {
    await this.page.goto('/login')
    await expect(this.page).toHaveURL(/\/login$/)
  }

  async login(email, password) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
    await expect(this.page).toHaveURL(/\/(dashboard|$)/)
  }
}
