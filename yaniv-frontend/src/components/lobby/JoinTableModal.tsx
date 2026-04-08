import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useStrings } from '../../strings';

interface Props {
  open: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
}

export function JoinTableModal({ open, onClose, onJoin }: Props) {
  const s = useStrings();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const mapJoinError = (message: string) => {
    switch (message) {
      case 'Table not found':
        return s.joinTable.notFound;
      case 'Table full':
        return s.joinTable.full;
      case 'Game already started':
        return s.joinTable.started;
      default:
        return message || s.errors.unknown;
    }
  };

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 4 || !/^\d{4}$/.test(trimmed)) {
      setError(s.joinTable.invalidCode);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onJoin(trimmed);
      onClose();
    } catch (e) {
      setError(mapJoinError((e as Error).message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={s.joinTable.title}>
      <div className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder={s.joinTable.codePlaceholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-2xl tracking-widest text-center placeholder-white/20 outline-none focus:border-emerald-500"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            {s.joinTable.cancel}
          </Button>
          <Button onClick={handleJoin} disabled={loading || code.length !== 4} className="flex-1">
            {s.joinTable.join}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
