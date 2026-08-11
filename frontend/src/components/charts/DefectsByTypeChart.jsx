import {
  Bar,
  BarChart,
  CartesianGrid,
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

export default function DefectsByTypeChart({ data, emptyMessage }) {
  if (!data?.length) {
    return <ChartEmptyState message={emptyMessage} />
  }

  return (
    <ResponsiveContainer width="100%" height={168}>
      <BarChart data={data} margin={chartMargins.bar} barCategoryGap="18%">
        <CartesianGrid {...chartGridProps} />
        <XAxis
          dataKey="name"
          {...chartAxisProps}
          interval={0}
          angle={data.length > 3 ? -18 : 0}
          textAnchor={data.length > 3 ? 'end' : 'middle'}
          height={data.length > 3 ? 48 : 24}
        />
        <YAxis {...chartAxisProps} allowDecimals={false} width={36} />
        <Tooltip
          cursor={{ fill: 'rgba(31, 143, 115, 0.06)' }}
          content={({ active, payload, label }) => (
            <ChartTooltipContent
              active={active}
              payload={payload?.map((item) => ({ ...item, color: CHART_PALETTE[0] }))}
              label={label}
            />
          )}
        />
        <Bar
          dataKey="value"
          fill={CHART_PALETTE[0]}
          radius={[10, 10, 0, 0]}
          maxBarSize={42}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
