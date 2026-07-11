import { useEffect, useState } from "react";

export default function SplashScreen({ onDone }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 350);
    const doneTimer = setTimeout(onDone, 2400);
    return () => {
      clearInterval(dotTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className="splash-overlay">
      <div className="splash-box">
        <div className="splash-title">AgentAIM Online Service</div>
        <div className="splash-line">Dialing web-of-trust.net{dots}</div>
        <div className="splash-line small">Negotiating protocol… verifying modem… establishing link</div>
        <div className="splash-bar">
          <div className="splash-bar-fill" />
        </div>
        <div className="splash-line small blink">Please do not pick up the phone</div>
      </div>
    </div>
  );
}
