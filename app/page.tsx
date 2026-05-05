import Link from "next/link";
import {
  getAllLocations,
  getReviews,
  getReviewsThisWeek,
  getWeeklyBreakdown,
  type GHLLocation,
} from "@/lib/ghl";
import { Stars } from "@/components/Stars";
import { WeeklyChart } from "@/components/WeeklyChart";

export const dynamic = "force-dynamic";

async function ClientCard({ location }: { location: GHLLocation }) {
  const data = await getReviews(location.id);
  const weeklyReviews = getReviewsThisWeek(data.reviews);
  const weeklyBreakdown = getWeeklyBreakdown(data.reviews);

  return (
    <Link href={`/${location.slug}`} className="block group">
      <div className="card p-6 h-full flex flex-col gap-5 relative overflow-hidden cursor-pointer transition-transform duration-200 group-hover:-translate-y-0.5">
        {/* Hover glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at top left, ${location.color}0A, transparent 60%)`,
          }}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 relative">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold font-display shrink-0"
              style={{ background: `${location.color}20`, color: location.color }}
            >
              {location.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-text leading-tight">
                {location.name}
              </p>
              {location.city && (
                <p className="text-xs text-muted mt-0.5">{location.city}</p>
              )}
            </div>
          </div>
          {/* GMB status badge */}
          <span
            className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
            style={
              data.hasGMB
                ? { background: "#34D39915", color: "#34D399" }
                : { background: "#4B556320", color: "#4B5563" }
            }
          >
            {data.hasGMB ? "GMB ✓" : "Sin GMB"}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 relative">
          <div className="text-center">
            <p className="stat-label">Total</p>
            <p className="font-display font-bold text-xl text-text mt-1">
              {data.hasGMB ? data.totalReviews : "—"}
            </p>
          </div>
          <div className="text-center border-x border-border">
            <p className="stat-label">Semana</p>
            <p
              className="font-display font-bold text-xl mt-1"
              style={{
                color:
                  !data.hasGMB
                    ? "#4B5563"
                    : weeklyReviews.length > 0
                    ? "#34D399"
                    : "#EFF2FF",
              }}
            >
              {data.hasGMB ? `+${weeklyReviews.length}` : "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="stat-label">Media</p>
            <div className="flex flex-col items-center mt-1 gap-0.5">
              <p className="font-display font-bold text-xl text-text">
                {data.hasGMB && data.totalReviews > 0
                  ? data.averageRating.toFixed(1)
                  : "—"}
              </p>
              {data.hasGMB && data.totalReviews > 0 && (
                <Stars rating={data.averageRating} size={10} />
              )}
            </div>
          </div>
        </div>

        {/* Mini chart (solo si tiene GMB y reviews) */}
        {data.hasGMB && data.totalReviews > 0 && (
          <div className="relative">
            <p className="stat-label mb-3">Últimos 7 días</p>
            <WeeklyChart data={weeklyBreakdown} color={location.color} />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end mt-auto relative">
          <span className="text-xs text-muted group-hover:text-primary transition-colors flex items-center gap-1">
            Ver dashboard
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  let locations: GHLLocation[] = [];
  let error = "";

  try {
    locations = await getAllLocations();
  } catch (e) {
    error = (e as Error).message;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const gmbCount = locations.length; // Se calculará en el render

  return (
    <main className="relative z-10 min-h-screen px-6 py-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="fade-in mb-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="text-xs text-muted capitalize">{dateStr}</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-text tracking-tight">
          Panel de Reseñas
        </h1>
        <p className="text-muted text-sm mt-1">
          {error
            ? "Error cargando clientes — revisa las variables de entorno"
            : `${locations.length} clientes en tu agencia — datos en tiempo real`}
        </p>
      </div>

      {error && (
        <div className="card p-6 mb-6 border-red-900 fade-up">
          <p className="text-sm text-red-400 font-mono">{error}</p>
          <p className="text-xs text-muted mt-2">
            Asegúrate de tener configurados <code className="text-primary">GHL_API_KEY</code> y{" "}
            <code className="text-primary">GHL_COMPANY_ID</code> en las variables de entorno de Vercel.
          </p>
        </div>
      )}

      {/* Filters row */}
      {locations.length > 0 && (
        <div className="flex items-center gap-3 mb-6 fade-in">
          <div className="flex-1 relative">
            <input
              type="search"
              placeholder="Buscar cliente..."
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
              disabled // Server component — se puede hacer cliente con "use client"
            />
          </div>
        </div>
      )}

      {/* Client grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {locations.map((location, i) => (
          <div
            key={location.id}
            className="fade-up"
            style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}
          >
            <ClientCard location={location} />
          </div>
        ))}
      </div>

      {locations.length === 0 && !error && (
        <div className="text-center py-20 text-muted text-sm">
          No se encontraron clientes en la agencia.
        </div>
      )}

      <div className="mt-16 text-center">
        <p className="text-xs text-muted">
          Sincronizado con Go High Level · Clientes actualizados cada hora · Reviews cada 30 min
        </p>
      </div>
    </main>
  );
}
