type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      alt="AWS Mastery Practice"
      className={className}
      decoding="async"
      height={96}
      src="/aws-mastery-logo.svg"
      width={360}
    />
  );
}
