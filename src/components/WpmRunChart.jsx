import { memo, useMemo } from "react";
import { buildSmoothPath } from "../utils/chartPath";

const WIDTH = 640;
const HEIGHT = 190;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

/** WPM across the run, one point per second, with the run average and personal best for context. */
function WpmRunChart({ samples = [], bestWpm = 0, isDark = true }) {
  const model = useMemo(() => {
    if (!Array.isArray(samples) || samples.length < 2) return null;
    const maxWpm = Math.max(10, ...samples, bestWpm || 0);
    const ceiling = Math.ceil(maxWpm / 10) * 10 + 10;
    const innerWidth = WIDTH - PAD.left - PAD.right;
    const innerHeight = HEIGHT - PAD.top - PAD.bottom;
    const toY = (value) => PAD.top + innerHeight - (value / ceiling) * innerHeight;
    const points = samples.map((wpm, index) => ({
      x: PAD.left + (index / (samples.length - 1)) * innerWidth,
      y: toY(wpm)
    }));
    const average = Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length);
    const linePath = buildSmoothPath(points, "y");
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD.top + innerHeight} L ${points[0].x} ${PAD.top + innerHeight} Z`;
    const ticks = [0, 0.5, 1].map((fraction) => Math.round(ceiling * fraction));
    return { points, linePath, areaPath, average, avgY: toY(average), bestY: bestWpm ? toY(bestWpm) : null, ticks, toY, innerHeight, ceiling };
  }, [samples, bestWpm]);

  if (!model) return null;

  const grid = isDark ? "rgba(167,139,250,0.14)" : "rgba(100,116,139,0.2)";
  const label = isDark ? "#a7a3c4" : "#64748b";

  return (
    <figure className="m-0" aria-label={`WPM over time. Average ${model.average} words per minute.`}>
      <figcaption className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: label }}>
        <span>WPM over time</span>
        <span>avg {model.average}{bestWpm ? ` · best ${bestWpm}` : ""}</span>
      </figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="wpm-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a78bfa" stopOpacity="0.45" />
            <stop offset="1" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wpm-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#e879f9" />
          </linearGradient>
        </defs>
        {model.ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={model.toY(tick)} y2={model.toY(tick)} stroke={grid} strokeDasharray="3 5" />
            <text x={PAD.left - 8} y={model.toY(tick) + 4} textAnchor="end" fontSize="11" fill={label}>{tick}</text>
          </g>
        ))}
        {model.bestY !== null && (
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={model.bestY} y2={model.bestY} stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="6 5" opacity="0.8" />
        )}
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={model.avgY} y2={model.avgY} stroke="#34d399" strokeWidth="1.2" strokeDasharray="2 4" opacity="0.8" />
        <path d={model.areaPath} fill="url(#wpm-area)" />
        <path d={model.linePath} fill="none" stroke="url(#wpm-line)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <text x={PAD.left} y={HEIGHT - 8} fontSize="11" fill={label}>0s</text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 8} fontSize="11" fill={label} textAnchor="end">{samples.length}s</text>
      </svg>
    </figure>
  );
}

export default memo(WpmRunChart);
