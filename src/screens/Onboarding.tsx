import { useEffect, useState } from "react";
import { BudgetEditor } from "../components/BudgetEditor";
import { Icon, Logo } from "../components/UI";
export function Onboarding() {
  const [step, setStep] = useState(3);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);
  const slides = [
    {
      icon: "Wallet",
      tag: "A little clarity goes a long way",
      title: (
        <>
          Track every
          <br />
          <span>rupee.</span>
        </>
      ),
      text: "Coffee runs. Rent days. Little treats. Bring it all into focus, one expense at a time.",
    },
    {
      icon: "ChartNoAxesCombined",
      tag: "A plan that feels like you",
      title: (
        <>
          Budget at
          <br />
          <span>every level.</span>
        </>
      ),
      text: "Start with your salary. Make room for your needs, your wants, and the future you’re building.",
    },
    {
      icon: "ShieldCheck",
      tag: "Your money. Your business.",
      title: (
        <>
          100% private.
          <br />
          <span>Works offline.</span>
        </>
      ),
      text: "No bank access. No SMS reading. No account. Your data stays on your phone.",
    },
  ];
  return (
    <div className="onboarding">
      <header>
        <Logo />
        <span className="eyebrow">YOUR MONEY, IN FOCUS</span>
      </header>
      {step < 3 ? (
        <>
          <div className={`onboard-art art-${step}`}>
            <div className="orbit one" />
            <div className="orbit two" />
            <div className="floating-chip chip-one">
              <Icon name="Check" size={15} /> A little more clarity
            </div>
            <div className="big-lens">
              <Icon name={slides[step].icon} size={65} />
            </div>
            <div className="floating-chip chip-two">
              <span className="tiny-dot" /> Every rupee counts
            </div>
            <span className="art-star">✦</span>
          </div>
          <div className="onboard-copy">
            <span className="eyebrow">{slides[step].tag}</span>
            <h1>{slides[step].title}</h1>
            <p>{slides[step].text}</p>
          </div>
          <div className="onboard-bottom">
            <div className="slide-dots">
              {slides.map((_, i) => (
                <button
                  aria-label={`Introduction ${i + 1}`}
                  aria-current={step === i}
                  key={i}
                  onClick={() => setStep(i)}
                  className={step === i ? "active" : ""}
                />
              ))}
            </div>
            <button
              className="button primary"
              onClick={() => setStep(step + 1)}
            >
              {step === 2 ? "Set up my budget" : "Continue"}
              <Icon name="ArrowUpRight" size={18} />
            </button>
            <button className="text-button" onClick={() => setStep(3)}>
              Skip intro
            </button>
            <p className="privacy-inline">
              <Icon name="LockKeyhole" size={13} /> Private by design. Yours
              from day one.
            </p>
          </div>
        </>
      ) : (
        <div className="onboard-setup">
          <button className="back-button" onClick={() => setStep(0)}>
            <Icon name="CircleHelp" /> Take a quick tour
          </button>
          <span className="eyebrow">LET’S MAKE A LITTLE ROOM</span>
          <h1>
            Your salary.
            <br />
            <span>Your plan.</span>
          </h1>
          <p className="muted">
            What’s your monthly take-home salary? Enter your amount, then choose
            how much goes to Needs, Wants and Savings.
          </p>
          <BudgetEditor onDone={() => {}} />
          <p className="privacy-inline">
            <Icon name="LockKeyhole" size={14} /> No bank access. No SMS
            reading. No account.
            <br />
            Your data stays on your phone.
          </p>
        </div>
      )}
    </div>
  );
}
