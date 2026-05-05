import type { DailyCount } from "@/lib/ghl";

export function WeeklyChart({
  data,
  color = "#4F8EF7",
}: {
  data: DailyCount[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 80;
  const barWidth = 28;
  const gap = 10;
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${totalWidth} ${chartHeight + 24}`}
        width="100%"
        style={{ overflow: "visible" }}
      >
        {data.map((day, i) => {
          const barH = max > 0 ? (day.count / max) * chartHeight : 0;
          const x = i * (barWidth + gap);
          const y = chartHeight - barH;
          const isToday = i === data.length - 1;

          return (
            <g key={day.date}>
              {/* Background bar */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={chartHeight}
                rx={6}
                fill="#1A1D2B"
              />
              {/* Value bar */}
              {barH > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={6}
                  fill={isToday ? color : `${color}88`}
                  style={{
                    filter: isToday ? `drop-shadow(0 0 6px ${color}66)` : "none",
                  }}
                />
              )}
              {/* Count label */}
              {day.count > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill={color}
                  fontSize={10}
                  fontFamily="var(--font-sora)"
                  fontWeight="600"
                >
                  {day.count}
                </text>
              )}
              {/* Day label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 18}
                textAnchor="middle"
                fill={isToday ? "#EFF2FF" : "#4B5563"}
                fontSize={10}
                fontFamily="var(--font-sora)"
                fontWeight={isToday ? "600" : "400"}
              >
                {day.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
