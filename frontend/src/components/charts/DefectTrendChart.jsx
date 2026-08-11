import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import ChartEmptyState from './ChartEmptyState'
import {
  CHART_PALETTE,
  ChartTooltipContent,
  chartAxisProps,
  chartGridProps,
  chartMargins
} from './chartTheme'

export default function DefectTrendChart({ data, emptyMessage }) {
  if (!data?.length) {
    return <ChartEmptyState message={emptyMessage} />
  }

  const denseLabels = data.length > 8

  return (
    <ResponsiveContainer width="100%" height={148}>
      <LineChart data={data} margin={chartMargins.bar}>
        <CartesianGrid {...chartGridProps} />
        <XAxis
          dataKey="name"
          {...chartAxisProps}
          interval={denseLabels ? 'preserveStartEnd' : 0}
          angle={denseLabels ? -24 : 0}
          textAnchor={denseLabels ? 'end' : 'middle'}
          height={denseLabels ? 44 : 24}
        />
        <YAxis {...chartAxisProps} allowDecimals={false} width={36} />
        <Tooltip
          cursor={{ stroke: 'rgba(31, 143, 115, 0.15)', strokeWidth: 1 }}
          content={({ active, payload, label }) => (
            <ChartTooltipContent
              active={active}
              payload={payload?.map((item) => ({ ...item, color: CHART_PALETTE[0] }))}
              label={label}
            />
          )}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_PALETTE[0]}
          strokeWidth={2.5}
          dot={{ r: 3, fill: CHART_PALETTE[0], strokeWidth: 0 }}
          activeDot={{ r: 5, fill: CHART_PALETTE[1] }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
