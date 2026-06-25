import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "../components/BrandLogo";
import { LoginPage } from "../components/LoginPage";

describe("brand logo", () => {
  it("renders the official AWS Mastery logo without layout shift", () => {
    const markup = renderToStaticMarkup(<BrandLogo className="h-12" />);

    expect(markup).toContain('src="/aws-mastery-logo.svg"');
    expect(markup).toContain('alt="AWS Mastery Practice"');
    expect(markup).toContain('width="360"');
    expect(markup).toContain('height="96"');
  });

  it("anchors the desktop login logo to the left content axis", () => {
    const markup = renderToStaticMarkup(<LoginPage />);

    expect(markup).toContain(
      'class="relative z-10 -ml-2 -mt-2 h-16 w-60 shrink-0 self-start"',
    );
    expect(markup).toContain("max-w-[1180px]");
    expect(markup).toContain("-translate-y-8");
  });

  it("keeps the mobile logo in a compact top brand region", () => {
    const markup = renderToStaticMarkup(<LoginPage />);

    expect(markup).toContain(
      'class="-ml-2 h-11 w-[165px] shrink-0 self-start lg:hidden"',
    );
    expect(markup).toContain(
      "justify-start pb-6 pt-12 sm:justify-center sm:py-8 lg:py-12",
    );
  });
});
