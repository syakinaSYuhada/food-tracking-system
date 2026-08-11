import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import ChartEmptyState from './ChartEmptyState'
import {
  ChartLegendContent,
  ChartTooltipContent,
  chartMargins
} from './chartTheme'

export default function ActionsByStatusChart({ data, emptyMessage }) {
  if (!data?.length) {
    return <ChartEmptyState message={emptyMessage} />
  }

  return (
    <ResponsiveContainer width="100%" height={168}>
      <PieChart margin={chartMargins.pie}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={38}
          outerRadius={62}
          paddingAngle={2}
          stroke="#fff"
          strokeWidth={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => (
            <ChartTooltipContent active={active} payload={payload} />
          )}
        />
        <Legend content={(props) => <ChartLegendContent payload={props.payload} />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
