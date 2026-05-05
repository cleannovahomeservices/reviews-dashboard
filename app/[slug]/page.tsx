import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllLocations,
  getReviews,
  getReviewsThisWeek,
  getReviewsThisMonth,
  getWeeklyBreakdown,
  getRatingDistribution,
} from "@/lib/ghl";
import { Stars } from "@/components/Stars";
import { WeeklyChart } from "@/components/WeeklyChart";

export const dynamic = "force-dynamic";

const STAR_MAP: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `Hace ${Math.floor(days / 30)} mes.`;
  return `Hace ${Math.floor(days / 365)} año(s)`;
}

export default async function ClientPage({ params }: { params: { slug: string } }) {
  // Buscamos el cliente por slug entre todas las locations de la agencia
  const locations = await getAllLocations();
  const location = locations.find((l) => l.slug === params.slug);
  if (!location) notFound();

  const data = await getReviews(location.id);
  const weeklyReviews = getReviewsThisWeek(data.reviews);
  const monthlyReviews = getReviewsThisMonth(data.reviews);
  const weeklyBreakdown = getWeeklyBreakdown(data.reviews);
  const distribution = getRatingDistribution(data.reviews);

  const recentReviews = [...data.reviews]
    .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
    .slice(0, 10);

  const now = new Date();
  const weekRange = (() => {
    const from = new Date();
    from.setDate(from.getDate() - 6);
    return `${from.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${now.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`;
  })();

  return (
    <main className="relative z-10 min-h-screen px-4 sm:px-6 py-8 max-w-3xl mx-auto">
      {/* Back */}
      <div className="fade-in mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Volver al panel
        </Link>
      </div>

      {/* Client header */}
      <div className="fade-up mb-6">
        <div className="card p-6 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at top left, ${location.color}12, transparent 60%)`,
            }}
          />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold font-display shrink-0"
                style={{ background: `${location.color}20`, color: location.color }}
              >
                {location.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl text-text">{location.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {location.city && (
                    <p className="text-sm text-muted">{location.city}</p>
                  )}
                  {location.website && (
                    <a
                      href={location.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {location.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="stat-label">Informe semanal</p>
              <p className="text-sm text-text mt-1">{weekRange}</p>
            </div>
          </div>
        </div>
      </div>

      {!data.hasGMB ? (
        <div className="card p-10 text-center fade-up">
          <div className="text-4xl mb-3">🔌</div>
          <p className="font-display font-semibold text-text">Google My Business no conectado</p>
          <p className="text-muted text-sm mt-2">
            Este cliente no tiene GMB vinculado en Go High Level.
            <br />Conéctalo en GHL → Reputation → Google My Business.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 fade-up animate-delay-1">
            {[
              { label: "Total reviews", value: String(data.totalReviews) },
              {
                label: "Esta semana",
                value: `+${weeklyReviews.length}`,
                highlight: weeklyReviews.length > 0,
              },
              { label: "Este mes", value: `+${monthlyReviews.length}` },
              {
                label: "Nota media",
                value: data.totalReviews > 0 ? data.averageRating.toFixed(1) : "—",
                suffix: data.totalReviews > 0 ? "/5" : "",
              },
            ].map((stat) => (
              <div key={stat.label} className="card p-4 text-center">
                <p className="stat-label mb-2">{stat.label}</p>
                <p
                  className="font-display font-bold text-2xl"
                  style={{ color: stat.highlight ? "#34D399" : location.color }}
                >
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-sm font-normal text-muted">{stat.suffix}</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Weekly chart */}
          <div className="card p-6 mb-5 fade-up animate-delay-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-display font-semibold text-sm text-text">Reseñas por día</p>
                <p className="text-xs text-muted mt-0.5">Últimos 7 días</p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: `${location.color}15`, color: location.color }}
              >
                {weeklyReviews.length} esta semana
              </span>
            </div>
            <WeeklyChart data={weeklyBreakdown} color={location.color} />
          </div>

          {/* Rating distribution */}
          {data.totalReviews > 0 && (
            <div className="card p-6 mb-5 fade-up animate-delay-3">
              <div className="flex items-center justify-between mb-4">
                <p className="font-display font-semibold text-sm text-text">Valoraciones</p>
                <div className="flex items-center gap-2">
                  <Stars rating={data.averageRating} size={13} />
                  <span className="text-sm font-bold text-text">{data.averageRating.toFixed(1)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = distribution[stars] ?? 0;
                  const pct = data.totalReviews > 0 ? (count / data.totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3">
                      <div className="w-16 shrink-0">
                        <Stars rating={stars} size={11} />
                      </div>
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background:
                              stars >= 4 ? "#34D399" : stars === 3 ? "#F5C842" : "#F87171",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted w-6 text-right shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent reviews */}
          {recentReviews.length > 0 && (
            <div className="fade-up animate-delay-4">
              <p className="font-display font-semibold text-sm text-text mb-3 px-1">
                Reseñas recientes
              </p>
              <div className="flex flex-col gap-3">
                {recentReviews.map((review) => {
                  const stars = STAR_MAP[review.starRating] ?? review.rating ?? 0;
                  return (
                    <div key={review.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-xs font-bold text-text shrink-0">
                            {review.reviewer.displayName?.charAt(0) ?? "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text leading-tight">
                              {review.reviewer.displayName}
                            </p>
                            <Stars rating={stars} size={11} />
                          </div>
                        </div>
                        <span className="text-xs text-muted shrink-0">{timeAgo(review.createTime)}</span>
                      </div>
                      {review.comment && (
                        <p className="text-xs text-muted leading-relaxed line-clamp-3 pl-10">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="mt-12 text-center pb-4 fade-in">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs"
          style={{
            background: `${location.color}10`,
            color: location.color,
            border: `1px solid ${location.color}20`,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: location.color, display: "inline-block" }} />
          Datos en tiempo real · Go High Level
        </div>
        <p className="text-xs text-muted mt-3">
          {now.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
    </main>
  );
}
