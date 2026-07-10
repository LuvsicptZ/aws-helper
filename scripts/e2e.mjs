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

async function expectVisible(locator, label) {
  await locator.waitFor({ state: "visible", timeout: 7000 });
  expect(await locator.isVisible(), `Expected ${label} to be visible`);
}

function captureBrowserErrors(page) {
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
}

async function verifyLoginPage(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

  await expectVisible(
    page.getByRole("heading", { name: "Ready for the next question?" }),
    "login heading",
  );
  await expectVisible(page.getByLabel("Email"), "email field");
  await expectVisible(
    page.getByRole("button", { name: "Continue with Google" }),
    "Google sign in",
  );

  expect(
    (await page.getByRole("button", { name: "Local mode" }).count()) === 0,
    "Expected login to be the only application entry",
  );
  expect(
    (await page.getByText("Create local profile").count()) === 0,
    "Expected no local profile bypass",
  );

  const pageOverflow = await page.locator("body").evaluate(
    (body) => body.scrollWidth - body.clientWidth,
  );
  expect(
    pageOverflow <= 1,
    `Expected no horizontal overflow at ${viewport.width}px, received ${pageOverflow}px`,
  );

  if (viewport.width >= 1024) {
    const layout = await page.locator("[data-login-shell]").evaluate((shell) => {
      const leftTitle = shell
        .querySelector("[data-login-promise]")
        ?.getBoundingClientRect();
      const form = shell
        .querySelector("[data-login-form]")
        ?.getBoundingClientRect();

      return {
        formWidth: form?.width ?? Number.POSITIVE_INFINITY,
        centerDelta:
          leftTitle && form
            ? Math.abs(
                leftTitle.top +
                  leftTitle.height / 2 -
                  (form.top + form.height / 2),
              )
            : Number.POSITIVE_INFINITY,
      };
    });

    expect(
      layout.formWidth <= 400,
      `Expected the login form to be at most 400px wide, got ${layout.formWidth}px`,
    );
    expect(
      layout.centerDelta <= 80,
      `Expected the two columns to share a visual axis, delta was ${layout.centerDelta}px`,
    );
  }

  if (viewport.width === 768) {
    const bounds = await page.locator("[data-login-shell]").evaluate((shell) =>
      ["[data-login-visual]", "[data-login-form]"].map((selector) => {
        const rect = shell.querySelector(selector)?.getBoundingClientRect();
        return {
          selector,
          left: rect?.left ?? Number.NEGATIVE_INFINITY,
          right: rect?.right ?? Number.POSITIVE_INFINITY,
        };
      }),
    );

    for (const bound of bounds) {
      expect(
        bound.left >= -1 && bound.right <= 769,
        `Expected ${bound.selector} inside the tablet viewport, got ${bound.left}-${bound.right}`,
      );
    }
  }

  if (viewport.width === 390) {
    const mobileLayout = await page.locator("[data-login-shell]").evaluate((shell) => {
      const visual = shell
        .querySelector("[data-login-visual]")
        ?.getBoundingClientRect();
      const panelElement = shell.querySelector("#access");
      const panel = panelElement?.getBoundingClientRect();
      const email = shell.querySelector("#login-email")?.closest(".login-calm-field")
        ?.getBoundingClientRect();
      const panelRadius = panelElement
        ? Number.parseFloat(getComputedStyle(panelElement).borderTopLeftRadius)
        : Number.POSITIVE_INFINITY;

      return {
        emailBottom: email?.bottom ?? Number.POSITIVE_INFINITY,
        heroHeight: visual?.height ?? Number.POSITIVE_INFINITY,
        overlap:
          visual && panel ? Math.max(0, visual.bottom - panel.top) : Number.POSITIVE_INFINITY,
        panelRadius,
      };
    });

    expect(
      mobileLayout.heroHeight >= 224 && mobileLayout.heroHeight <= 256,
      `Expected a 224-256px mobile hero, got ${mobileLayout.heroHeight}px`,
    );
    expect(
      mobileLayout.overlap <= 40,
      `Expected at most 40px mobile overlap, got ${mobileLayout.overlap}px`,
    );
    expect(
      mobileLayout.panelRadius <= 32,
      `Expected at most 32px mobile panel radius, got ${mobileLayout.panelRadius}px`,
    );
    expect(
      mobileLayout.emailBottom <= viewport.height,
      `Expected the complete email field above the fold, bottom was ${mobileLayout.emailBottom}px`,
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  captureBrowserErrors(page);

  console.log("E2E login: desktop");
  await verifyLoginPage(page, { width: 1280, height: 900 });

  console.log("E2E login: mobile");
  await verifyLoginPage(page, { width: 390, height: 844 });

  console.log("E2E login: tablet");
  await verifyLoginPage(page, { width: 768, height: 1024 });

  expect(
    browserErrors.length === 0,
    `Expected no browser errors, received: ${browserErrors.join(" | ")}`,
  );

  console.log("E2E passed: authenticated-only login entry");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server.close();
}
