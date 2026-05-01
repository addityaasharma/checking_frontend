import React, { useState, useEffect } from 'react'

const Render = () => {
    const [charsVisible, setCharsVisible] = useState(false);

    useEffect(() => {
        // Trigger char animation once on mount
        setCharsVisible(true);
    }, []);

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100vh', background: '#fafaf9',
            fontFamily: "'Nunito', sans-serif",
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@900&display=swap');
        @keyframes sp-char {
          0% { opacity: 0; transform: translateY(20px) scale(0.8); }
          60% { opacity: 1; transform: translateY(-4px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sp-dot {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.2; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        .sp-char {
          display: inline-block;
          opacity: 0;
        }
        .sp-char.visible {
          animation: sp-char 0.5s cubic-bezier(.34,1.56,.64,1) both;
          animation-fill-mode: forwards;
        }
        .sp-dot {
          display: inline-block; width: 7px; height: 7px;
          border-radius: 50%; margin: 0 4px;
          animation: sp-dot 1.2s infinite ease-in-out;
        }
      `}</style>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
                <div style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {'Scratch'.split('').map((c, i) => (
                        <span
                            key={i}
                            className={`sp-char${charsVisible ? ' visible' : ''}`}
                            style={{ color: '#1a1a2e', animationDelay: `${i * 0.055}s` }}
                        >
                            {c}
                        </span>
                    ))}
                    {[['P', '#FF5500'], ['a', '#8B2FC9'], ['d', '#0088FF']].map(([c, col], i) => (
                        <span
                            key={i}
                            className={`sp-char${charsVisible ? ' visible' : ''}`}
                            style={{ color: col, animationDelay: `${(7 + i) * 0.055}s` }}
                        >
                            {c}
                        </span>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="sp-dot" style={{ background: '#FF5500', animationDelay: '0s' }} />
                    <span className="sp-dot" style={{ background: '#8B2FC9', animationDelay: '0.2s' }} />
                    <span className="sp-dot" style={{ background: '#0088FF', animationDelay: '0.4s' }} />
                </div>
            </div>
        </div>
    );
};

export default Render;