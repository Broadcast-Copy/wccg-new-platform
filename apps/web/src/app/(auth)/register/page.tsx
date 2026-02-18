import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Register | WCCG 104.5 FM",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Create an account</h1>
        <p className="text-muted-foreground">
          Join the WCCG community
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
