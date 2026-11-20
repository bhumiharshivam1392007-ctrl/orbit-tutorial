import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

interface MonthlyCollectionChartProps {
  data: Array<{
    month: string
    amount: number
  }>
}

export function MonthlyCollectionChart({ data }: MonthlyCollectionChartProps) {
  const hasData = data && data.some((d) => d.amount > 0)

  return (
    <div className="h-[300px] w-full pt-4">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border/50"
            />
            <XAxis
              dataKey="month"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length && payload[0]) {
                  const item = payload[0]
                  return (
                    <div className="rounded-xl border border-border/60 bg-popover/95 p-2.5 shadow-xl backdrop-blur-md">
                      <p className="text-xs font-medium text-muted-foreground">
                        {item.payload?.month} Collection
                      </p>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(Number(item.value || 0))}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#6366f1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#feeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center p-6 border border-dashed border-border/60 rounded-2xl">
          <p className="text-sm font-medium text-muted-foreground">
            No fee payment records found in the last 6 months.
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1">
            Collections will appear dynamically as payments are recorded.
          </p>
        </div>
      )}
    </div>
  )
}
