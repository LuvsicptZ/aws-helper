import { chromium } from "playwright";
import { createServer } from "vite";

const PREFERRED_PORT = 4173;
let baseUrl = "";
const browserErrors = [];

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function expectVisible(locator, label) {
  await locator.waitFor({ state: "visible", timeout: 7000 });
  expect(await locator.isVisible(), `Expected ${label} to be visible`);
}

async function enterLocalModeIfNeeded(page) {
  const loginHeading = page.getByRole("heading", { name: "Welcome back" });
  if (await loginHeading.isVisible()) {
    await page.getByRole("button", { name: "Local mode" }).click();
  }
}

function sidebar(page) {
  return page.getByRole("complementary");
}

function captureBrowserErrors(page) {
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
}

async function runDesktopFlow(page) {
  console.log("E2E desktop: login");
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await expectVisible(
    page.getByRole("heading", { name: "Welcome back" }),
    "Login page",
  );
  await expectVisible(
    page.getByRole("button", { name: "Continue with Google" }),
    "Google sign in",
  );
  await page.getByRole("button", { name: "Local mode" }).click();

  console.log("E2E desktop: dashboard");
  await expectVisible(
    page.getByRole("heading", { name: "Start your AWS practice" }),
    "Dashboard",
  );

  console.log("E2E desktop: secondary navigation");
  const secondaryPages = [
    ["Topics", "Topics"],
    ["My Notes", "My Notes"],
    ["Flashcards", "Flashcards"],
    ["Analytics", "Analytics"],
    ["Study History", "Study History"],
  ];

  for (const [buttonName, headingName] of secondaryPages) {
    await page.getByRole("button", { name: buttonName }).click();
    await expectVisible(
      page.getByRole("heading", { name: headingName }),
      headingName,
    );
  }

  await page.getByRole("button", { name: "Start Focus Session" }).click();
  await expectVisible(page.getByRole("heading", { name: "Focus Mode" }), "Focus Mode");

  await sidebar(page).getByRole("button", { name: "Dashboard" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Start your AWS practice" }),
    "Dashboard",
  );

  console.log("E2E desktop: review mode switching");
  await sidebar(page).getByRole("button", { name: "Review Incorrect" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Practice session" }),
    "Practice session",
  );
  await expectVisible(page.getByText("Current mode: Incorrect"), "incorrect mode");
  await sidebar(page).getByRole("button", { name: "Review Guessed" }).click();
  await expectVisible(page.getByText("Current mode: Guessed"), "guessed mode");
  await sidebar(page).getByRole("button", { name: "Dashboard" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Start your AWS practice" }),
    "Dashboard",
  );

  console.log("E2E desktop: mock exam restart");
  await sidebar(page).getByRole("button", { name: "Mock Exams" }).click();
  await expectVisible(page.getByRole("heading", { name: "Mock exam" }), "Mock exam");
  await page.getByRole("button", { name: "Choice A" }).first().click();
  await expectVisible(page.getByText(/1 \/ 65 answered/), "answered exam count");
  await sidebar(page).getByRole("button", { name: "Mock Exams" }).click();
  await expectVisible(page.getByText(/0 \/ 65 answered/), "reset exam count");
  await sidebar(page).getByRole("button", { name: "Dashboard" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Start your AWS practice" }),
    "Dashboard",
  );

  console.log("E2E desktop: practice");
  await page.getByRole("button", { name: "Continue Practice" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Practice session" }),
    "Practice session",
  );
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expectVisible(page.getByText("Question 4", { exact: true }), "question 4");
  await sidebar(page).getByRole("button", { name: "Dashboard" }).click();
  await sidebar(page).getByRole("button", { name: "Question Bank" }).click();
  await expectVisible(
    page.getByText("Question 4", { exact: true }),
    "restored question 4",
  );
  await page.getByRole("button", { name: "Choice A" }).first().click();
  await expectVisible(
    page.locator("p.mt-1.text-sm.text-gray-700"),
    "answer explanation",
  );

  console.log("E2E desktop: back to dashboard");
  await sidebar(page).getByRole("button", { name: "Dashboard" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Start your AWS practice" }),
    "Dashboard",
  );
  await expectVisible(
    page.getByRole("button", {
      name: "Continue Sequential · Question 4",
    }),
    "saved practice destination",
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await expectVisible(
    page.getByRole("button", {
      name: "Continue Sequential · Question 4",
    }),
    "persisted practice destination",
  );
}

async function runMobileExamFlow(page) {
  console.log("E2E mobile: mock exam");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await enterLocalModeIfNeeded(page);
  await page.getByRole("button", { name: "Mock exam" }).click();

  await expectVisible(page.getByRole("heading", { name: "Mock exam" }), "Mock exam");
  await expectVisible(page.getByText(/130:00|129:59/), "exam timer");
  await expectVisible(page.getByText(/0 \/ 65 answered/), "answered count");

  console.log("E2E mobile: answer and submit");
  await page.getByRole("button", { name: "Choice A" }).first().click();
  await expectVisible(page.getByText(/1 \/ 65 answered/), "updated answered count");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Submit" }).click();
  await expectVisible(page.getByText(/Score \d+%/), "score summary");
  await expectVisible(page.getByLabel("Exam score summary"), "local save status");
}

async function runMobilePracticeOverflowFlow(page) {
  console.log("E2E mobile: practice explanation stays within viewport");
  await page.setViewportSize({ width: 437, height: 900 });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await enterLocalModeIfNeeded(page);
  await page.getByRole("button", { name: "Continue Practice" }).click();

  for (let index = 1; index < 16; index += 1) {
    await page.getByRole("button", { name: "Next" }).click();
  }

  await expectVisible(page.getByText("Question 16", { exact: true }), "question 16");
  await page.getByRole("button", { name: "Choice A" }).click();
  await expectVisible(
    page.locator("p.mt-1.text-sm.text-gray-700"),
    "answer explanation",
  );

  for (const width of [437, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const mainOverflow = await page.locator("main").evaluate(
      (main) => main.scrollWidth - main.clientWidth,
    );
    expect(
      mainOverflow <= 1,
      `Expected mobile practice content not to overflow at ${width}px, but it exceeded main by ${mainOverflow}px`,
    );
  }
}

const server = await createServer({
  server: {
    host: "127.0.0.1",
    port: PREFERRED_PORT,
    strictPort: false,
  },
  logLevel: "warn",
});

let browser;

try {
  await server.listen();
  baseUrl = server.resolvedUrls?.local[0] ?? `http://127.0.0.1:${PREFERRED_PORT}/`;
  console.log(`E2E server: ${baseUrl}`);

  browser = await chromium.launch({ timeout: 30000 });
  const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  captureBrowserErrors(desktopPage);
  await withTimeout(runDesktopFlow(desktopPage), 30000, "desktop flow");

  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  captureBrowserErrors(mobilePage);
  await withTimeout(runMobileExamFlow(mobilePage), 30000, "mobile exam flow");

  const mobilePracticePage = await browser.newPage({
    viewport: { width: 437, height: 900 },
  });
  captureBrowserErrors(mobilePracticePage);
  await withTimeout(
    runMobilePracticeOverflowFlow(mobilePracticePage),
    30000,
    "mobile practice overflow flow",
  );
  expect(
    browserErrors.length === 0,
    `Expected no browser errors, received: ${browserErrors.join(" | ")}`,
  );

  console.log(
    "E2E passed: desktop practice, mobile mock exam, and mobile practice flows",
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server.close();
}
