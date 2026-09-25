'use client';

import { cn } from '@/components/ui/styles';
import { formatBRL } from '@/lib/money';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Categorical palette for series, validated for the dark surface (#111111): lightness band,
 * CVD and normal-vision separation between neighbors, 3:1 contrast. Order matters; don't cycle.
 * A 9th+ cofre folds into "Outros".
 */
const SERIES_COLORS = ['#9945ff', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#3987e5', '#e66767'];
const OTHER_COLOR = '#71717a';

type Row = { month: string; cofreId: string; amount: number };
type Series = { id: string; name: string; color: string };
type Range = '6' | '12' | 'all';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5)) - 1]}/${ym.slice(2, 4)}`;
const monthLong = (ym: string) => {
	const s = new Date(`${ym}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
	return s.charAt(0).toUpperCase() + s.slice(1);
};

function addMonths(ym: string, n: number) {
	const [y, m] = ym.split('-').map(Number);
	const d = new Date(Date.UTC(y, m - 1 + n, 1));
	return d.toISOString().slice(0, 7);
}

function compactBRL(v: number) {
	if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
	if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
	return `R$ ${Math.round(v)}`;
}

/** 1-2-5 "nice" step so gridlines land on round values. */
function niceTicks(maxValue: number, count = 4) {
	if (maxValue <= 0) return [0];
	const raw = maxValue / count;
	const pow = Math.pow(10, Math.floor(Math.log10(raw)));
	const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw)!;
	const ticks: number[] = [];
	for (let v = 0; v <= maxValue + step * 0.999; v += step) ticks.push(v);
	return ticks;
}

/** Rect with only the top (free end) corners rounded. */
function topRoundedRect(x: number, y: number, w: number, h: number, r: number) {
	const rr = Math.min(r, w / 2, h);
	return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export function MonthlyDepositsChart({
	cofres,
	rows,
	currentMonth,
}: {
	cofres: { id: string; name: string }[];
	rows: Row[];
	currentMonth: string;
}) {
	const [range, setRange] = useState<Range>('12');
	const [active, setActive] = useState<number | null>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(360);
	const [scrollLeft, setScrollLeft] = useState(0);

	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;
		const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// Color follows the cofre (creation order), never its rank in the current view.
	const { series, seriesOf } = useMemo(() => {
		const overflow = cofres.length > SERIES_COLORS.length;
		const named = overflow ? cofres.slice(0, SERIES_COLORS.length - 1) : cofres;
		const list: Series[] = named.map((c, i) => ({ id: c.id, name: c.name, color: SERIES_COLORS[i] }));
		if (overflow) list.push({ id: '__other', name: 'Outros', color: OTHER_COLOR });
		const map = new Map(named.map(c => [c.id, c.id]));
		return { series: list, seriesOf: (cofreId: string) => map.get(cofreId) ?? '__other' };
	}, [cofres]);

	const months = useMemo(() => {
		const first = rows.length ? rows.reduce((a, r) => (r.month < a ? r.month : a), rows[0].month) : currentMonth;
		const start = range === 'all' ? first : addMonths(currentMonth, -(Number(range) - 1));
		const list: string[] = [];
		for (let m = start; m <= currentMonth; m = addMonths(m, 1)) list.push(m);
		return list;
	}, [rows, range, currentMonth]);

	const data = useMemo(
		() =>
			months.map(month => {
				const values: Record<string, number> = {};
				for (const r of rows) {
					if (r.month !== month) continue;
					const sid = seriesOf(r.cofreId);
					values[sid] = (values[sid] ?? 0) + r.amount;
				}
				const total = Object.values(values).reduce((s, v) => s + v, 0);
				return { month, values, total };
			}),
		[months, rows, seriesOf],
	);

	const total = data.reduce((s, d) => s + d.total, 0);
	const best = data.reduce<(typeof data)[number] | null>((a, d) => (d.total > (a?.total ?? 0) ? d : a), null);
	const ticks = niceTicks(Math.max(...data.map(d => d.total), 0));
	const yMax = ticks[ticks.length - 1] || 1;

	// Geometry. Scrolls horizontally when "Tudo" has more months than fit.
	const H = 220;
	const pad = { top: 12, right: 4, bottom: 26, left: 50 };
	const minBand = 22; // 12 months fit a 360px phone without scrolling
	const svgW = Math.max(width, pad.left + pad.right + months.length * minBand);
	const plotW = svgW - pad.left - pad.right;
	const plotH = H - pad.top - pad.bottom;
	const band = plotW / Math.max(1, months.length);
	const barW = Math.max(8, Math.min(28, band * 0.6));
	const y = (v: number) => pad.top + plotH - (v / yMax) * plotH;
	const labelEvery = Math.ceil(36 / band);
	const GAP = 2;

	const activeDatum = active !== null ? data[active] : null;

	return (
		<div className="space-y-4">
			<dl className="grid grid-cols-3 gap-2">
				<Kpi label="Total no período" value={formatBRL(total)} />
				<Kpi label="Média mensal" value={formatBRL(months.length ? total / months.length : 0)} />
				<Kpi
					label="Maior mês"
					value={best ? formatBRL(best.total) : '—'}
					sub={best ? monthLabel(best.month) : undefined}
				/>
			</dl>

			<div className="glass rounded-3xl p-4">
				<div className="mb-3 flex items-center justify-between gap-2">
					<h2 className="font-semibold">Aportes por mês</h2>
					<div role="radiogroup" aria-label="Período" className="flex rounded-full bg-white/5 p-1 text-xs">
						{(
							[
								['6', '6M'],
								['12', '12M'],
								['all', 'Tudo'],
							] as const
						).map(([value, label]) => (
							<button
								key={value}
								type="button"
								role="radio"
								aria-checked={range === value}
								onClick={() => {
									setRange(value);
									setActive(null);
								}}
								className={cn(
									'min-h-8 rounded-full px-3 transition',
									range === value ? 'bg-white text-black' : 'text-muted hover:text-white',
								)}>
								{label}
							</button>
						))}
					</div>
				</div>

				{series.length > 1 && (
					<ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted" aria-label="Legenda">
						{series.map(s => (
							<li key={s.id} className="flex items-center gap-1.5">
								<span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
								{s.name}
							</li>
						))}
					</ul>
				)}

				<div ref={wrapRef} className="relative">
					{activeDatum && (
						<div
							className="pointer-events-none absolute top-0 z-10 w-52 rounded-2xl border border-white/10 bg-[#1a1a1a]/95 p-3 text-xs shadow-xl backdrop-blur"
							style={{
								left: Math.min(
									Math.max(0, pad.left + band * active! + band / 2 - 104 - scrollLeft),
									Math.max(0, width - 208),
								),
							}}
							role="status">
							<p className="mb-1.5 font-semibold text-white">{monthLong(activeDatum.month)}</p>
							{series
								.filter(s => activeDatum.values[s.id])
								.map(s => (
									<p key={s.id} className="flex items-center justify-between gap-3 text-muted">
										<span className="flex min-w-0 items-center gap-1.5">
											<span
												className="h-2 w-2 shrink-0 rounded-sm"
												style={{ background: s.color }}
												aria-hidden
											/>
											<span className="truncate">{s.name}</span>
										</span>
										<span className="tabular-nums text-white">
											{formatBRL(activeDatum.values[s.id])}
										</span>
									</p>
								))}
							<p className="mt-1.5 flex justify-between border-t border-white/10 pt-1.5 font-semibold text-white">
								<span>Total</span>
								<span className="tabular-nums">{formatBRL(activeDatum.total)}</span>
							</p>
						</div>
					)}

					<div
						className="overflow-x-auto"
						onScroll={e => {
							setScrollLeft(e.currentTarget.scrollLeft);
							setActive(null);
						}}>
						<svg
							width={svgW}
							height={H}
							role="img"
							aria-label={`Aportes por mês, ${monthLabel(months[0])} a ${monthLabel(months[months.length - 1])}. Total ${formatBRL(total)}.`}
							onMouseLeave={() => setActive(null)}
							className="block select-none">
							{ticks.map(t => (
								<g key={t}>
									<line
										x1={pad.left}
										x2={svgW - pad.right}
										y1={y(t)}
										y2={y(t)}
										stroke="rgb(255 255 255 / 0.07)"
									/>
									<text
										x={pad.left - 8}
										y={y(t)}
										dy="0.32em"
										textAnchor="end"
										className="fill-subtle text-[10px] tabular-nums">
										{compactBRL(t)}
									</text>
								</g>
							))}

							{data.map((d, i) => {
								const cx = pad.left + band * i + band / 2;
								const x = cx - barW / 2;
								const stack = series.filter(s => d.values[s.id]);
								let acc = 0;
								return (
									<g key={d.month}>
										{active === i && (
											<rect
												x={pad.left + band * i}
												y={pad.top}
												width={band}
												height={plotH}
												fill="rgb(255 255 255 / 0.05)"
												rx={6}
											/>
										)}
										{stack.map((s, k) => {
											const v = d.values[s.id];
											const y0 = y(acc);
											acc += v;
											const y1 = y(acc);
											const isTop = k === stack.length - 1;
											// 2px surface gap between stacked segments.
											const h = Math.max(1, y0 - y1 - (k > 0 ? GAP : 0));
											const top = y1;
											return isTop ? (
												<path
													key={s.id}
													d={topRoundedRect(x, top, barW, h, 4)}
													fill={s.color}
												/>
											) : (
												<rect key={s.id} x={x} y={top} width={barW} height={h} fill={s.color} />
											);
										})}
										{i % labelEvery === 0 && (
											<text
												x={cx}
												y={H - 8}
												textAnchor="middle"
												className="fill-subtle text-[10px]">
												{monthLabel(d.month)}
											</text>
										)}
										{/* Hit target: the whole column, much bigger than the bar. */}
										<rect
											x={pad.left + band * i}
											y={pad.top}
											width={band}
											height={plotH + pad.bottom}
											fill="transparent"
											onMouseEnter={() => setActive(i)}
											onClick={() => setActive(i)}>
											<title>{`${monthLong(d.month)}: ${formatBRL(d.total)}`}</title>
										</rect>
									</g>
								);
							})}
							<line
								x1={pad.left}
								x2={svgW - pad.right}
								y1={y(0)}
								y2={y(0)}
								stroke="rgb(255 255 255 / 0.2)"
							/>
						</svg>
					</div>
				</div>
				{total === 0 && <p className="mt-2 text-center text-sm text-muted">Nenhum aporte neste período.</p>}
			</div>

			<details className="glass rounded-3xl p-4">
				<summary className="cursor-pointer font-semibold">Ver tabela</summary>
				<table className="mt-3 w-full text-sm tabular-nums">
					<thead>
						<tr className="text-left text-xs text-subtle">
							<th className="py-1.5 font-normal">Mês</th>
							<th className="py-1.5 text-right font-normal">Total</th>
						</tr>
					</thead>
					<tbody>
						{[...data].reverse().map(d => (
							<tr key={d.month} className="border-t border-white/5 align-top">
								<td className="py-2">
									<span>{monthLong(d.month)}</span>
									{series
										.filter(s => d.values[s.id])
										.map(s => (
											<span
												key={s.id}
												className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle">
												<span
													className="h-2 w-2 rounded-sm"
													style={{ background: s.color }}
													aria-hidden
												/>
												{s.name}: {formatBRL(d.values[s.id])}
											</span>
										))}
								</td>
								<td className="py-2 text-right">{formatBRL(d.total)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</details>
		</div>
	);
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
	return (
		<div className="glass rounded-2xl p-3">
			<dt className="text-[11px] leading-tight text-muted">{label}</dt>
			<dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
			{sub && <dd className="text-[11px] text-subtle">{sub}</dd>}
		</div>
	);
}
