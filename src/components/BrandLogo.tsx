type BrandLogoProps = {
  className?: string;
  onClick?: () => void;
};

export function BrandLogo({ className, onClick }: BrandLogoProps) {
  const logo = (
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
