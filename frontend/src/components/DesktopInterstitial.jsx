import React from "react";
import { Leaf } from "lucide-react";

export default function DesktopInterstitial() {
    return (
        <div
            data-testid="desktop-interstitial"
            className="relative flex min-h-[100dvh] items-center justify-center px-8 tg-no-select"
            style={{ background: "#08080a" }}
        >
            <div className="tg-ambient" />
            <div className="tg-noise relative w-full max-w-md rounded-3xl p-10 text-center tg-glass-strong">
                <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-2xl tg-glass">
                    <Leaf size={28} className="text-emerald-400" />
                </div>
                <h1 className="mb-3 text-2xl font-black tracking-tight text-white">
                    Touch Grass is a mobile experience.
                </h1>
                <p className="text-sm leading-relaxed text-white/55">
                    Open this page on your phone to begin. The compass, the map,
                    and the world are waiting outside.
                </p>
            </div>
        </div>
    );
}
