import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, X, Package, AlertCircle } from "lucide-react";
import { searchOpportunityItems, getItemDetails, type ErpItemDetails } from "../../api/crm";
import { useDebounce } from "../../hooks/useDebounce";

interface Props {
  value: string;
  onSelect: (item: ErpItemDetails) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function OpportunityItemCodeSelect({
  value,
  onSelect,
  placeholder = "Search item code or name…",
  disabled = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 200);

  // Sync internal state when external value changes
  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset to original value if closed without selecting
        setSearch(value || "");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, value]);

  // Query ERPNext Item DocType live using official search_link
  const {
    data: items = [],
    isLoading: isSearching,
    isError,
  } = useQuery({
    queryKey: ["erpnext-items-search", debouncedSearch],
    queryFn: () => searchOpportunityItems(debouncedSearch),
    enabled: isOpen && !disabled,
    staleTime: 60_000,
  });

  const handleSelectItem = async (itemCode: string) => {
    setIsLoadingDetails(true);
    try {
      const details = await getItemDetails(itemCode);
      onSelect(details);
      setSearch(details.item_code);
      setIsOpen(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearch("");
    onSelect({
      item_code: "",
      item_name: "",
      description: "",
      uom: "Nos",
      rate: 0,
    });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-neutral-400" />
        <input
          type="text"
          value={search}
          disabled={disabled || isLoadingDetails}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full rounded border border-neutral-300 bg-white py-1.5 pl-8 pr-7 text-xs text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-neutral-100"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {isLoadingDetails || (isSearching && isOpen) ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600" />
          ) : search && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-neutral-400 hover:text-neutral-600"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown Popup */}
      {isOpen && !disabled && (
        <div className="absolute left-0 top-full mt-1 w-80 sm:w-96 rounded-lg border border-neutral-200 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="bg-neutral-50 px-3 py-1.5 border-b border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
            <span className="font-semibold text-neutral-700">ERPNext Items</span>
            <span>{isSearching ? "Searching…" : `${items.length} records`}</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-neutral-100">
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                <span>Searching items in ERPNext…</span>
              </div>
            ) : isError ? (
              <div className="flex items-center gap-2 p-4 text-xs text-red-600 bg-red-50/50">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Failed to search items from ERPNext.</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-400">
                <Package className="mx-auto h-5 w-5 text-neutral-300 mb-1" />
                No matching ERPNext items found for "{debouncedSearch}".
              </div>
            ) : (
              items.map((item) => {
                const isSelected = item.value === value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleSelectItem(item.value)}
                    className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors ${
                      isSelected
                        ? "bg-primary-50/80 border-l-2 border-primary-600"
                        : "hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 font-mono">
                        {item.value}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider">
                          Selected
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-neutral-500 truncate max-w-full">
                        {item.description}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
