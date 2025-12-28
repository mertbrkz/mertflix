export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="w-full md:w-1/2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 rounded-md bg-slate-800 text-white placeholder:text-slate-400"
      />
    </div>
  )
}
