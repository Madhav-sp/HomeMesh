import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Metric = {
  cpu_percent: number | null;
  memory_percent: number | null;
  disk_percent: number | null;
  created_at: string;
};

type Props = {
  data: Metric[];
  range: number;
  onRangeChange: (range: number) => void;
};

export default function MetricCharts({
  data,
  range,
  onRangeChange,
}: Props) {
  const chartData = data.map((item) => ({
    time: new Date(item.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    CPU: item.cpu_percent ?? 0,
    Memory: item.memory_percent ?? 0,
    Disk: item.disk_percent ?? 0,
  }));

  return (
    <div className="mt-8 rounded-xl border border-slate-800 bg-[#151c28] p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Resource Usage
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">
            CPU, memory and disk usage historical metrics
          </p>
        </div>

        <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
          {[5, 30, 60].map((minutes) => (
            <button
              key={minutes}
              onClick={() => onRangeChange(minutes)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                range === minutes
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {minutes === 60
                ? "1 hour"
                : `${minutes} min`}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-72 items-center justify-center">
          <p className="text-xs text-slate-500">
            No metrics recorded for this time range.
          </p>
        </div>
      ) : (
        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2a374c"
                strokeOpacity={0.4}
              />

              <XAxis
                dataKey="time"
                tick={{
                  fill: "#94a3b8",
                  fontSize: 11,
                }}
              />

              <YAxis
                domain={[0, 100]}
                tick={{
                  fill: "#94a3b8",
                  fontSize: 11,
                }}
                tickFormatter={(value) => `${value}%`}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#f8fafc",
                }}
                formatter={(value) =>
                  `${Number(value).toFixed(1)}%`
                }
              />

              <Legend />

              <Line
                type="monotone"
                dataKey="CPU"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="Memory"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="Disk"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}