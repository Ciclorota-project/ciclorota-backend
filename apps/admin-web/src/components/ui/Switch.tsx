export function Switch(props: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  /** Cor do trilho quando desligado: 'neutral' (padrão, cinza) ou 'danger' (vermelho). */
  offTone?: 'neutral' | 'danger';
}) {
  const offTone = props.offTone ?? 'neutral';

  const trackTone = props.checked
    ? 'border-emerald-500/40 bg-emerald-500'
    : offTone === 'danger'
      ? 'border-rose-500/40 bg-rose-500'
      : 'border-zinc-700 bg-zinc-800';

  return (
    <label className={`inline-flex items-center gap-3 ${props.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        disabled={props.disabled}
        onClick={() => props.onChange(!props.checked)}
        className={`relative inline-block h-6 w-11 shrink-0 rounded-full border transition-colors ${trackTone} disabled:cursor-not-allowed`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            props.checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>

      {props.label ? (
        <span>
          <span className="block text-sm font-medium text-zinc-200">{props.label}</span>
          {props.description ? <span className="block text-xs text-zinc-500">{props.description}</span> : null}
        </span>
      ) : null}
    </label>
  );
}
