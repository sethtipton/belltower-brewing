import React, { useMemo, useState, useCallback } from 'react';

interface Answers { mood: string; body: string; bitterness: string; flavorFocus: string[]; alcoholPreference: string }
interface Step { key: keyof Answers; label: string; helper?: string; options: string[]; type?: 'chips' }
interface PairingFormProps {
  open: boolean;
  loading: boolean;
  error?: string | null;
  success?: string | null;
  onSubmit?: (answers: Answers) => void;
  onPreparedChange?: (answers: Answers) => void;
  onInteraction?: () => void;
};

const STEPS: Step[] = [
  { key: 'mood', label: 'Mood', helper: 'Rapidly captures risk, novelty, and thirst.', options: ['Adventurous', 'Comforting / Familiar', 'Refreshing / Light', 'Indulgent / Decadent'] },
  { key: 'body', label: 'Texture / Body', helper: 'Maps to maltiness, alcohol, and mouthfeel preferences.', options: ['Thin / Crisp', 'Medium', 'Full / Creamy / Viscous'] },
  { key: 'bitterness', label: 'Bitterness tolerance', helper: 'Approximates IBU preference for hop-forward beers.', options: ['Low', 'Medium', 'High'] },
  { key: 'flavorFocus', label: 'Flavor focus', helper: 'Pick up to 3 flavor tags.', options: ['Tropical','Citrus','Roasty','Caramel','Banana','Clove','Dry','Creamy','Crisp','Smoky','Spicy','Tart','Funky'], type: 'chips' },
  { key: 'alcoholPreference', label: 'Alcohol / Strength preference', helper: 'Quickly filters session vs. stronger beers.', options: ['Low', 'Moderate', 'Strong'] },
];

const defaultAnswers: Answers = {
  mood: '',
  body: '',
  bitterness: '',
  flavorFocus: [],
  alcoholPreference: '',
};

function completeAnswers(raw: unknown): Answers {
  const base = raw && typeof raw === 'object' ? raw : {};
  const a = base as Record<string, unknown>;
  return {
    mood: typeof a.mood === 'string' ? a.mood : '',
    body: typeof a.body === 'string' ? a.body : '',
    bitterness: typeof a.bitterness === 'string' ? a.bitterness : '',
    flavorFocus: Array.isArray(a.flavorFocus) ? a.flavorFocus.slice(0, 3).map((v) => String(v)) : [],
    alcoholPreference: typeof a.alcoholPreference === 'string' ? a.alcoholPreference : '',
  };
}

export function PairingForm({
  open,
  loading,
  error,
  success,
  onSubmit,
  onPreparedChange,
  onInteraction,
}: PairingFormProps): React.ReactElement | null {
  const [answers, setAnswers] = useState<Answers>(() => defaultAnswers);
  const [step, setStep] = useState(0);

  const prepared = useMemo(() => completeAnswers(answers), [answers]);
  const notifyPrepared = useCallback((next: Answers) => {
    if (typeof onPreparedChange === 'function') {
      onPreparedChange(next);
    }
  }, [onPreparedChange]);

  const currentStep = STEPS[step] ?? STEPS[0];
  const stepsCount = STEPS.length;

  const toggleSelect = useCallback(
    (key: Step['key'], value: string, max = 3) => {
      setAnswers((prev) => {
        const next =
          key === 'flavorFocus'
            ? (() => {
                const exists = prev.flavorFocus.includes(value);
                if (exists) {
                  return { ...prev, flavorFocus: prev.flavorFocus.filter((v) => v !== value) };
                }
                if (prev.flavorFocus.length >= max) return prev;
                return { ...prev, flavorFocus: [...prev.flavorFocus, value] };
              })()
            : { ...prev, [key]: value === prev[key] ? '' : value };
        notifyPrepared(completeAnswers(next));
        return next;
      });
      if (typeof onInteraction === 'function') onInteraction();
    },
    [onInteraction, notifyPrepared]
  );

  const handleNext = useCallback(() => setStep((s) => Math.min(s + 1, stepsCount - 1)), [stepsCount]);
  const handleBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const handleSubmit = useCallback(() => {
    if (typeof onSubmit === 'function') {
      onSubmit(prepared);
    }
  }, [onSubmit, prepared]);

  if (!open) return null;

  return (
    <div className="pairing-form" aria-live="polite">
      <fieldset className="pairing-step">
        <legend className="bt-q-label">{currentStep.label}</legend>
        {currentStep.helper && <div className="bt-q-helper">{currentStep.helper}</div>}
        {currentStep.type === 'chips' && (
          <>
            <div className="bt-flavor-note">Select up to 3 flavors.</div>
            <div className="bt-chip-row">
              {currentStep.options.map((opt) => {
                const selected = answers.flavorFocus.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`bt-chip ${selected ? 'active' : ''}`}
                    onClick={() => toggleSelect('flavorFocus', opt, 3)}
                    aria-pressed={selected}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {!currentStep.type && (
          <div className="bt-q-row" role="group" aria-label={currentStep.label}>
            {currentStep.options.map((opt) => {
              const selected = answers[currentStep.key] === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`bt-q-opt ${selected ? 'active' : ''}`}
                  onClick={() => toggleSelect(currentStep.key, opt)}
                  aria-pressed={selected}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>
      <div className="pairing-form-nav">
        <button type="button" onClick={handleBack} disabled={step === 0}>Back</button>
        {step < stepsCount - 1 ? (
          <button type="button" onClick={handleNext}>Next</button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={loading}>Find Pairing</button>
        )}
      </div>
      <div className="pairing-loading">
        <div className="pairing-selection" aria-live="polite">
          {answers.mood && <div><strong>Mood:</strong> {answers.mood}</div>}
          {answers.body && <div><strong>Body:</strong> {answers.body}</div>}
          {answers.bitterness && <div><strong>Bitterness:</strong> {answers.bitterness}</div>}
          {answers.flavorFocus && answers.flavorFocus.length > 0 && (
            <div><strong>Flavor focus:</strong> {answers.flavorFocus.join(' | ')}</div>
          )}
          {answers.alcoholPreference && <div><strong>Alcohol preference:</strong> {answers.alcoholPreference}</div>}
        </div>
      </div>
      {loading ? <p className="pairing-form-fetch">Fetching pairing…<br />Beer List will update shortly and highlight recommended beers.</p> : null}
      {error && <div className="pairing-form-error">{error}</div>}
      {success && <div className="pairing-form-success">{success}</div>}
    </div>
  );
}
