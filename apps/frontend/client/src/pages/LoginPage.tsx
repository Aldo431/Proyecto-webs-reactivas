import { Header } from "../components/Header.tsx";
import { TextField } from "../components/TextField.tsx";

export function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header showBackButton />
      <main className="mx-auto flex max-w-md flex-col px-4 py-14">
        <h1 className="mb-8 text-3xl font-bold text-brand-900">
          Iniciar sesión
        </h1>
        <form
          onSubmit={(event) => event.preventDefault()}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <TextField label="Correo electrónico" name="email" type="email" />
          <TextField label="Contraseña" name="password" type="password" />
          <button
            type="submit"
            className="w-full rounded-lg bg-accent-600 py-2.5 font-semibold text-white transition hover:bg-accent-700"
          >
            Iniciar sesión
          </button>
        </form>
      </main>
    </div>
  );
}