type BrandLogoProps = {
  className?: string;
  onClick?: () => void;
  variant?: "default" | "compact";
};

export function BrandLogo({ className, onClick, variant = "default" }: BrandLogoProps) {
  const logo = variant === "compact" ? (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      data-brand-logo="true"
    >
      <text
        x="32"
        y="28"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontSize="17"
        fontWeight="800"
        fill="currentColor"
        textAnchor="middle"
        letterSpacing="-0.5"
      >
        aws
      </text>
      <path
        d="M18 31c7.5 5 18 5 25.5 -1"
        stroke="#FF9900"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M39 31.5l4.5 -2.5l-2 4.5"
        stroke="#FF9900"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x="32"
        y="47"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontSize="6.5"
        fontWeight="700"
        fill="currentColor"
        letterSpacing="2.2"
        textAnchor="middle"
      >
        MASTERY
      </text>
    </svg>
  ) : (
    <img
      alt="AWS Mastery Practice"
      className={className}
      data-brand-logo="true"
      decoding="async"
      height={96}
      src="/aws-mastery-logo.svg"
      width={360}
    />
  );

  if (!onClick) {
    return logo;
  }

  return (
    <button
      aria-label="Go to homepage"
      className="inline-flex cursor-pointer border-0 bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d88a12]"
      onClick={onClick}
      type="button"
    >
      {logo}
    </button>
  );
}
