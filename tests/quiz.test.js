import { test, expect } from "@playwright/test";

// Test: Ensure all quizzes have titles
test("all quizzes have titles", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    const quizTitles = page.locator("#quiz-cards > h2 > span");
    const count = await quizTitles.count();

    for (let i = 0; i < count; ++i) {
        const quizTitle = quizTitles.nth(i);
        await expect(quizTitle).not.toBeEmpty(); // Assert that each title is not empty
    }
});

// Test: Verify that quiz documents are downloadable
test("quiz documents are downloadable", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    const downloadables = page.locator("#quiz-cards > div > span > a");
    const downloadCount = await downloadables.count();

    for (let i = 0; i < downloadCount; i++) {
        const downloadPromise = page.waitForEvent('download');
        await downloadables.nth(i).click();
        const download = await downloadPromise;

        await expect(download.path()).not.toBeEmpty();
    }
});

// Test: Ensure all quizzes are playable
test("all quizzes are playable", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    const playButtons = page.getByRole('button', { name: /Start quiz/ });
    const count = await playButtons.count();

    for (let i = 0; i < count; i++) {
        await playButtons.nth(i).click();
        await page.getByRole('button', { name: 'Hjem' }).click(); // Navigate back after playing
    }
});

// Test: Verify quiz starts properly with valid titles and questions
test("quiz starts properly with valid content", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    await page.getByRole('button', { name: /Start quiz/ }).first().click();

    await expect(page.locator("#play-title")).not.toHaveText(/\?\?\?/);
    await expect(page.locator("#current-quiz-question-index")).not.toHaveText(/\?\?\?/);
    await expect(page.locator("#quiz-questions-count")).not.toHaveText(/\?\?\?/);
    await expect(page.locator("#quiz-question")).not.toHaveText(/\?\?\?/);

    const answerCardsTexts = await page.locator("#answer-cards").allInnerTexts();
    expect(answerCardsTexts.length).toBeGreaterThan(0);
    expect(answerCardsTexts.some(text => text.trim() !== '')).toBeTruthy();
});

// Test: Ensure user cannot go back on the first question
test("cannot go back on first question", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    await page.getByRole('button', { name: /Start quiz/ }).first().click();

    page.once('dialog', dialog => {
        expect(dialog.message()).toContain("Du er allerede på det første spørsmålet!");
        dialog.accept();
    });

    await page.locator("#previous-question-button").click();
    await expect(page.locator("#current-quiz-question-index")).toHaveText("1");
});

// Test: Prevent user from going to the next question without answering
test("cannot skip question without answering", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    await page.getByRole('button', { name: /Start quiz/ }).first().click();

    page.once('dialog', dialog => {
        expect(dialog.message()).toContain("Du må svare på spørsmålet før du fortsetter!");
        dialog.accept();
    });

    await page.locator("#next-question-button").click();
    await expect(page.locator("#current-quiz-question-index")).toHaveText("1");
});

// Test: Verify user can proceed to the next question after answering
test("can proceed to next question after answering", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    await page.getByRole('button', { name: /Start quiz/ }).first().click();

    const answerCards = page.locator("#answer-cards > div:visible");
    const randomAnswerIndex = Math.floor(Math.random() * await answerCards.count());
    await answerCards.nth(randomAnswerIndex).click();

    await page.locator("#next-question-button").click();
    await expect(page.locator("#current-quiz-question-index")).toHaveText("2");
});

// Test: Verify user can return to the previous question after answering
test("can return to previous question after answering", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    await page.getByRole('button', { name: /Start quiz/ }).first().click();

    const answerCards = page.locator("#answer-cards > div:visible");
    const randomAnswerIndex = Math.floor(Math.random() * await answerCards.count());
    await answerCards.nth(randomAnswerIndex).click();

    await page.locator("#next-question-button").click();
    await expect(page.locator("#current-quiz-question-index")).toHaveText("2");

    await page.locator("#previous-question-button").click();
    await expect(page.locator("#current-quiz-question-index")).toHaveText("1");
});

// Test: Verify feedback text is visible when going back to the previous question
test("feedback text is visible on returning to previous question", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    await page.getByRole('button', { name: /Start quiz/ }).first().click();

    const answerCards = page.locator("#answer-cards > div:visible");
    const randomAnswerIndex = Math.floor(Math.random() * await answerCards.count());
    await answerCards.nth(randomAnswerIndex).click();

    await page.locator("#next-question-button").click();
    await expect(page.locator("#current-quiz-question-index")).toHaveText("2");

    await page.locator("#previous-question-button").click();
    await expect(page.locator("#current-quiz-question-index")).toHaveText("1");

    const feedbackText = await page.locator("#play-answer-feedback").allInnerTexts();
    expect(feedbackText.some(text => text.trim() !== '')).toBeTruthy();
});

// Test: Verify feedback text is cleared on the next question
test("feedback text cleared on next question", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    await page.getByRole('button', { name: /Start quiz/ }).first().click();

    const answerCards = page.locator("#answer-cards > div:visible");
    await answerCards.nth(Math.floor(Math.random() * await answerCards.count())).click();

    await page.locator("#next-question-button").click();
    let feedbackText = await page.locator("#play-answer-feedback").allInnerTexts();
    expect(feedbackText.some(text => text.trim() === '')).toBeTruthy();

    await expect(page.locator("#current-quiz-question-index")).toHaveText("2");
});

// Test: Verify restart quiz works correctly
test("restart quiz resets to first question", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");
    await page.getByRole('button', { name: /Start quiz/ }).first().click();

    const answerCards = page.locator("#answer-cards > div:visible");
    await answerCards.nth(Math.floor(Math.random() * await answerCards.count())).click();

    await page.locator("#next-question-button").click();
    await expect(page.locator("#current-quiz-question-index")).toHaveText("2");

    await page.getByRole('button', { name: 'Start på nytt' }).click();
    const feedbackText = await page.locator("#play-answer-feedback").allInnerTexts();
    expect(feedbackText.some(text => text.trim() === '')).toBeTruthy();

    await expect(page.locator("#current-quiz-question-index")).toHaveText("1");
});

/**test("verify can hit results page", async ({ page }) => {
    await page.goto("https://quiz.krambo.xyz/");

    await page.getByRole('button', { name: /Start quiz/ }).first().click();

    const answerCards = page.locator("#answer-cards > div:visible");
    
    const end = parseInt(await page.locator("#quiz-questions-count").allInnerTexts());
    
    await page.evaluate(() => goToSpecificQuestion());

    answerCards.nth(0).click();

    await page.locator("#next-question-button").click();

    await expect(page.locator("#current-quiz-question-index")).toHaveText("2");

    await page.getByRole('button', { name: 'Start på nytt' }).click();

    const feedbackText = await page.locator("#play-answer-feedback").allInnerTexts();

    expect(feedbackText.some(text => text.trim() === '')).toBeTruthy();

    await expect(page.locator("#current-quiz-question-index")).toHaveText("1");

});**/
