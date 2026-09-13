interface TextFieldProps {
  label: string;
  name: string;
  type: "text" | "email" | "password";
}

export function TextField({ label, name, type }: TextFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-brand-900">
        {label}
      </span>
      <input
        type={type}
        name={name}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
      />
    </label>
  );
}