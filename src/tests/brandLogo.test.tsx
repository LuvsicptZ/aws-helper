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
      'class="relative z-10 h-14 w-[210px] shrink-0 self-start"',
    );
  });
});
