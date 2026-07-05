import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "../components/BrandLogo";
import { LoginPage } from "../components/LoginPage";
import { ResetPasswordPage } from "../components/ResetPasswordPage";

describe("brand logo", () => {
  it("renders the official AWS Mastery logo without layout shift", () => {
    const markup = renderToStaticMarkup(<BrandLogo className="h-12" />);

    expect(markup).toContain('src="/aws-mastery-logo.svg"');
    expect(markup).toContain('data-brand-logo="true"');
    expect(markup).toContain('alt="AWS Mastery Practice"');
    expect(markup).toContain('width="360"');
    expect(markup).toContain('height="96"');
  });

  it("renders the login page as a quiet practice gateway", () => {
    const markup = renderToStaticMarkup(<LoginPage />);

    expect(markup).toContain("data-practice-gateway");
    expect(markup).toContain("data-login-form");
    expect(markup).toContain("Welcome back");
    expect(markup).toContain("Sit down.");
    expect(markup).toContain("AWS Mastery");
    expect(markup).toContain("No clutter, no noise");
    expect(markup).not.toContain("Desktop");
    expect(markup).not.toContain("Mobile");
    expect(markup).not.toContain("The interface stays quiet");
    expect(markup).not.toContain("data-gsap-scroll-root");
    expect(markup).not.toContain("AI study engine");
  });

  it("keeps the gateway navigation minimal like the reference design", () => {
    const markup = renderToStaticMarkup(<LoginPage />);

    expect(markup).toContain("login-calm-nav");
    expect(markup).toContain('href="#access"');
    expect(markup).not.toContain('aria-label="AWS Mastery home"');
  });

  it("uses SVG icons instead of emoji in the login headline", () => {
    const markup = renderToStaticMarkup(<LoginPage />);

    expect(markup).not.toContain("👋");
  });

  it("renders the reset password page with the official logo", () => {
    const markup = renderToStaticMarkup(<ResetPasswordPage />);

    expect(markup).toContain('src="/aws-mastery-logo.svg"');
    expect(markup).toContain("Set a new password");
    expect(markup).toContain("Update password");
  });
});
