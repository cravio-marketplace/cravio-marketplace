import React from 'react';

export default function CravioLoader({ size = 'md', label = 'Loading Cravio', fullScreen = false }) {
    const dimensions = size === 'sm' ? 28 : size === 'lg' ? 64 : 42;
    return (
        <div className={fullScreen ? 'cravio-loader-screen' : 'cravio-loader'} role="status" aria-label={label}>
            <img src="/brand/cravio-icon.png" alt="" width={dimensions} height={dimensions} className="cravio-loader-mark" />
            {fullScreen && <span className="cravio-loader-label">{label}</span>}
            <span className="sr-only">{label}</span>
        </div>
    );
}
