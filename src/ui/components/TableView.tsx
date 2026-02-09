interface TableViewProps {
  data: any[];
}

export default function TableView({ data }: TableViewProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-400">No data to display.</p>
      </div>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden border border-zinc-700 rounded-lg">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="min-w-full divide-y divide-zinc-700">
            <thead className="bg-zinc-900 sticky top-0 z-10">
              <tr>
                {columns.map(col => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider border-b-2 border-zinc-700"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-zinc-800 divide-y divide-zinc-700">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-700 transition-colors duration-150">
                  {columns.map(col => (
                    <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-zinc-400 px-2">
        <span>{data.length} total records</span>
      </div>
    </div>
  );
}
