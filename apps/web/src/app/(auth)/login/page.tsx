import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Login | WCCG 104.5 FM",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">
          Sign in to your WCCG account
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
