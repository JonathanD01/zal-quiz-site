import { test, expect } from "@playwright/test";

// Test: Verify the page title
test("page title contains 'Quizer'", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    await expect(page).toHaveTitle(/Quizer/);
});

// Test: Ensure quiz play page is initially hidden
test("quiz play page is hidden initially", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    const quizPlayPage = page.locator("#play.hidden");
    await expect(quizPlayPage).toHaveCount(1);
});

// Test: Ensure quiz result page is initially hidden
test("quiz result page is hidden initially", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    const quizResultPage = page.locator("#quiz-result-page.hidden");
    await expect(quizResultPage).toHaveCount(1);
});

// Test: Verify visibility of quiz headings on the main page
test("quiz headings are visible on the main page", async ({ page }) => {
    await page.goto('https://quiz.krambo.xyz/');
    await expect(page.getByRole('heading', { name: 'Øv med quizer 🥳' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tilgjengelige quizer' })).toBeVisible();
});

// Test: Navigate to settings page and verify settings options
test("settings page and options are functional", async ({ page }) => {
    await page.goto('https://quiz.krambo.xyz/');
    await page.getByRole('heading', { name: 'Instillinger' }).click();
    await expect(page.getByText('Tilpass hvordan quizen')).toBeVisible();

    // List of settings to verify
    const settingsSelectors = [
        '#DARK_MODE',
        '#KEYBOARD_MODE',
        '#RANDOMIZE_QUESTIONS',
        '#RANDOMIZE_ANSWERS',
        '#SHOW_QUESTION_NUMBER',
        '#SHOW_ANSWER_OPTION',
        '#DEBUG'
    ];

    for (const selector of settingsSelectors) {
        const checkbox = page.locator(selector);
        await checkbox.check();
        await expect(checkbox).toBeChecked(); // Ensure the checkbox is checked
    }
});

// Test: Verify visibility of acknowledgments section
test("acknowledgments section is visible", async ({ page }) => {
    await page.goto('https://quiz.krambo.xyz/');
    await expect(page.getByRole('heading', { name: 'Anerkjennelse' })).toBeVisible();
});
