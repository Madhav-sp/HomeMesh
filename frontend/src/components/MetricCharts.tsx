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
    <div className="mt-8 rounded-2xl border border-white/10 bg-[#171a21] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Resource Usage
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            CPU, memory and disk usage history
          </p>
        </div>

        <div className="flex rounded-xl bg-[#0f1115] p-1">
          {[5, 30, 60].map((minutes) => (
            <button
              key={minutes}
              onClick={() => onRangeChange(minutes)}
              className={`rounded-lg px-3 py-2 text-xs transition ${
                range === minutes
                  ? "bg-white text-black"
                  : "text-gray-400 hover:text-white"
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
        <div className="flex h-80 items-center justify-center">
          <p className="text-sm text-gray-500">
            No metrics available for this time range.
          </p>
        </div>
      ) : (
        <div className="mt-6 h-80 w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                strokeOpacity={0.1}
              />

              <XAxis
                dataKey="time"
                tick={{
                  fill: "#6b7280",
                  fontSize: 11,
                }}
              />

              <YAxis
                domain={[0, 100]}
                tick={{
                  fill: "#6b7280",
                  fontSize: 11,
                }}
                tickFormatter={(value) => `${value}%`}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#171a21",
                  border:
                    "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
                formatter={(value) =>
                  `${Number(value).toFixed(1)}%`
                }
              />

              <Legend />

              <Line
                type="monotone"
                dataKey="CPU"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="Memory"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="Disk"
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