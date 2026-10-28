import { Plus, Trash2, Package } from "lucide-react";
import type { OpportunityItem } from "../../types/crm";
import type { ErpItemDetails } from "../../api/crm";
import OpportunityItemCodeSelect from "./OpportunityItemCodeSelect";

interface Props {
  items: OpportunityItem[];
  onChange?: (items: OpportunityItem[]) => void;
  readOnly?: boolean;
}

export default function OpportunityItemTable({
  items,
  onChange,
  readOnly = false,
}: Props) {
  const handleAddItem = () => {
    if (readOnly || !onChange) return;
    const newItem: OpportunityItem = {
      item_code: "",
      item_name: "",
      description: "",
      qty: 1,
      rate: 0,
      amount: 0,
      base_rate: 0,
      base_amount: 0,
      uom: "Nos",
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (readOnly || !onChange) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const handleItemSelect = (index: number, details: ErpItemDetails) => {
    if (readOnly || !onChange) return;
    const updated = items.map((it, i) => {
      if (i !== index) return it;
      const currentQty = Number(it.qty) || 1;
      const rate = Number(details.rate) || 0;
      const amount = currentQty * rate;
      return {
        ...it,
        item_code: details.item_code,
        item_name: details.item_name,
        description: details.description || details.item_name,
        uom: details.uom || "Nos",
        rate,
        amount,
        base_rate: rate,
        base_amount: amount,
        item_group: details.item_group,
        brand: details.brand,
      };
    });
    onChange(updated);
  };

  const handleItemChange = (index: number, field: keyof OpportunityItem, val: unknown) => {
    if (readOnly || !onChange) return;
    const updated = items.map((it, i) => {
      if (i !== index) return it;
      const mod = { ...it, [field]: val };
      if (field === "qty" || field === "rate") {
        const qty = Number(field === "qty" ? val : mod.qty) || 0;
        const rate = Number(field === "rate" ? val : mod.rate) || 0;
        const amount = qty * rate;
        mod.amount = amount;
        mod.base_rate = rate;
        mod.base_amount = amount;
      }
      return mod;
    });
    onChange(updated);
  };

  const totalAmount = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-neutral-900">
            Opportunity Items ({items.length})
          </h4>
          <p className="text-[11px] text-neutral-400">
            Connects to ERPNext Item master with real-time rate and amount calculation
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Row
          </button>
        )}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/50 text-neutral-500">
              <th className="py-2.5 px-3 font-semibold min-w-[240px]">Item Code / Description</th>
              <th className="py-2.5 px-3 font-semibold w-24">Qty</th>
              <th className="py-2.5 px-3 font-semibold w-24">UOM</th>
              <th className="py-2.5 px-3 font-semibold w-28">Rate</th>
              <th className="py-2.5 px-3 font-semibold w-28 text-right">Amount</th>
              {!readOnly && <th className="py-2.5 px-3 w-10 text-center" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 5 : 6} className="py-8 text-center text-neutral-400">
                  <Package className="mx-auto h-6 w-6 text-neutral-300 mb-1" />
                  No items added to this opportunity yet.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/60 align-top">
                  <td className="py-2.5 px-3">
                    {readOnly ? (
                      <div>
                        <span className="font-bold font-mono text-neutral-900">
                          {item.item_code || "—"}
                        </span>
                        {(item.item_name || item.description) && (
                          <p className="text-[11px] text-neutral-500">
                            {item.item_name || item.description}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <OpportunityItemCodeSelect
                          value={item.item_code || ""}
                          onSelect={(details) => handleItemSelect(idx, details)}
                          placeholder="Search ERPNext item code or name…"
                        />
                        {(item.item_name || item.description) && (
                          <p className="text-[11px] text-neutral-500 truncate max-w-xs pl-1">
                            {item.item_name || item.description}
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-2.5 px-3">
                    {readOnly ? (
                      <span className="font-medium text-neutral-900">{item.qty ?? 1}</span>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={item.qty ?? 1}
                        onChange={(e) => handleItemChange(idx, "qty", parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none"
                      />
                    )}
                  </td>

                  <td className="py-2.5 px-3">
                    {readOnly ? (
                      <span className="text-neutral-600">{item.uom || "Nos"}</span>
                    ) : (
                      <input
                        type="text"
                        value={item.uom || "Nos"}
                        onChange={(e) => handleItemChange(idx, "uom", e.target.value)}
                        placeholder="Nos"
                        className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none"
                      />
                    )}
                  </td>

                  <td className="py-2.5 px-3">
                    {readOnly ? (
                      <span className="font-medium text-neutral-900">
                        ${(Number(item.rate) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate ?? 0}
                        onChange={(e) => handleItemChange(idx, "rate", parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none"
                      />
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-right font-medium text-neutral-900">
                    ${(Number(item.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {!readOnly && (
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-neutral-400 hover:text-red-600 p-1"
                        title="Remove Row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t border-neutral-200 bg-neutral-50/50 font-bold text-neutral-900">
                <td colSpan={4} className="py-2.5 px-3 text-right">
                  Total Value:
                </td>
                <td className="py-2.5 px-3 text-right text-primary-700 font-mono text-sm">
                  ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                {!readOnly && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

