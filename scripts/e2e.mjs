import { chromium } from "playwright";
import { createServer } from "vite";

const PREFERRED_PORT = 4173;
let baseUrl = "";

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

function sidebar(page) {
  return page.getByRole("complementary");
}

async function runDesktopFlow(page) {
  console.log("E2E desktop: dashboard");
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await expectVisible(
    page.getByRole("heading", { name: /Welcome back/ }),
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
    page.getByRole("heading", { name: /Welcome back/ }),
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
    page.getByRole("heading", { name: /Welcome back/ }),
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
    page.getByRole("heading", { name: /Welcome back/ }),
    "Dashboard",
  );

  console.log("E2E desktop: practice");
  await page.getByRole("button", { name: "Continue Practice" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Practice session" }),
    "Practice session",
  );
  await page.getByRole("button", { name: "Choice A" }).first().click();
  await expectVisible(page.getByText("Correct answer:"), "answer explanation");

  console.log("E2E desktop: back to dashboard");
  await sidebar(page).getByRole("button", { name: "Dashboard" }).click();
  await expectVisible(
    page.getByRole("heading", { name: /Welcome back/ }),
    "Dashboard",
  );
}

async function runMobileExamFlow(page) {
  console.log("E2E mobile: mock exam");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
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
  await withTimeout(runDesktopFlow(desktopPage), 30000, "desktop flow");

  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await withTimeout(runMobileExamFlow(mobilePage), 30000, "mobile exam flow");

  console.log("E2E passed: desktop practice and mobile mock exam flows");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server.close();
}
