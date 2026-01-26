import React, { useMemo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Pint from './Pint';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';

interface Answers { mood: string; body: string; bitterness: string; flavorFocus: string[]; alcoholPreference: string }
interface Step { key: keyof Answers; label: string; helper?: string; options: string[]; type?: 'chips' }
interface PairingFormProps {
  open: boolean;
  onToggle?: () => void;
  loading: boolean;
  error?: string | null;
  success?: string | null;
  pintFillLevel?: number;
  pintRequestId?: number;
  pintTint?: string | null;
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
  onToggle,
  loading,
  error,
  success,
  pintFillLevel = 0,
  pintRequestId = 0,
  pintTint = null,
  onSubmit,
  onPreparedChange,
  onInteraction,
}: PairingFormProps): React.ReactElement | null {
  const [answers, setAnswers] = useState<Answers>(() => defaultAnswers);
  const [step, setStep] = useState(0);
  const prefersReduced = Boolean(usePrefersReducedMotion());
  const [renderFormBody, setRenderFormBody] = useState(open);

  const prepared = useMemo(() => completeAnswers(answers), [answers]);
  const notifyPrepared = useCallback((next: Answers) => {
    if (typeof onPreparedChange === 'function') {
      onPreparedChange(next);
    }
  }, [onPreparedChange]);

  const currentStep = STEPS[step] ?? STEPS[0];
  const stepsCount = STEPS.length;
  const hasSelection = Boolean(
    answers.mood ||
    answers.body ||
    answers.bitterness ||
    answers.alcoholPreference ||
    answers.flavorFocus?.length
  );
  const showPredictive = loading || Boolean(error) || Boolean(success);
  const submitDisabled = loading;
  const fadeProps = prefersReduced
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } };

  const handleToggle = useCallback(() => {
    if (!open) {
      setRenderFormBody(false);
      const raf = typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: () => void) => window.setTimeout(cb, 0);
      raf(() => setRenderFormBody(true));
    } else {
      setRenderFormBody(false);
    }
    if (typeof onToggle === 'function') {
      onToggle();
    }
  }, [open, onToggle]);

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

  return (
    <div className="pairing-form-wrapper">
      <p className="pairing-form-intro" id="pairing-form-intro">
        Tell us what sounds good today and we’ll suggest a couple taps to try.
      </p>
      <button
        type="button"
        className="help-btn"
        aria-expanded={open}
        aria-controls="pairing-form"
        aria-describedby="pairing-form-intro"
        onClick={handleToggle}
      >
        {open ? 'Close beer quiz' : 'Start the quick quiz'}
      </button>
      <AnimatePresence initial={false}>
        {open ? (
        <motion.div
          id="pairing-form"
          className="pairing-form"
          style={!prefersReduced ? { overflow: 'hidden' } : undefined}
          initial={prefersReduced ? false : { opacity: 0, y: -6, height: 0 }}
          animate={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, height: 'auto' }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
        {renderFormBody ? (
          <>
          <div className="pairing-form-nav">
            <button type="button" onClick={handleBack} disabled={step === 0}>Back</button>
            {step < stepsCount - 1 ? (
              <button type="button" onClick={handleNext}>Next</button>
            ) : (
              <button
                type="button"
                className="suggestbtn"
                onClick={handleSubmit}
                disabled={submitDisabled}
                aria-disabled={submitDisabled}
              >
                Suggest some beers I might like
              </button>
            )}
          </div>
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
          <div className="pairing-loading">
            <span className="sr-only" role="status" aria-live="polite">
              {loading
                ? 'Finding a beer...'
                : error
                ? "Couldn't load pairing. Please try again."
                : success
                ? 'Pairing ready.'
                : ''}
            </span>
            {hasSelection ? (
              <div className="pairing-form-pint">
                <Pint
                  key={`pairing-pint-${pintRequestId}`}
                  fillLevel={showPredictive ? pintFillLevel : 0}
                  animateFill={showPredictive}
                  animateFromEmpty={loading}
                  prefersReduced={prefersReduced}
                  tint={pintTint ?? null}
                  size={80}
                />
                <AnimatePresence initial={false}>
                  {loading ? (
                    <motion.p className="pairing-form-fetch" {...fadeProps}>
                      Fetching…
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}
            <div className="pairing-selection">
              {answers.mood && <div><strong>Mood:</strong> {answers.mood}</div>}
              {answers.body && <div><strong>Body:</strong> {answers.body}</div>}
              {answers.bitterness && <div><strong>Bitterness:</strong> {answers.bitterness}</div>}
              {answers.flavorFocus?.length ? (
                <div><strong>Flavor focus:</strong> {answers.flavorFocus.join(' | ')}</div>
              ) : null}
              {answers.alcoholPreference && <div><strong>Alcohol preference:</strong> {answers.alcoholPreference}</div>}
            </div>
          </div>
          <AnimatePresence initial={false}>
            {loading ? (
              <motion.p className="pairing-form-fetch-message" {...fadeProps}>
                Beer List will update shortly and highlight recommended beers.
              </motion.p>
            ) : null}
          </AnimatePresence>
          {error && <div className="pairing-form-error">{error}</div>}
          {success && <div className="pairing-form-success">{success}</div>}
          </>
        ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
