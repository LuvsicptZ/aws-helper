export function getDashboardGreeting(isAuthenticated: boolean): {
  title: string;
  subtitle: string;
} {
  return isAuthenticated
    ? {
        title: "Welcome back",
        subtitle: "Keep going one small session at a time.",
      }
    : {
        title: "Start your AWS practice",
        subtitle: "Build momentum one question at a time.",
      };
}
