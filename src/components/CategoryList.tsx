import type { Bucket, Category, Transaction } from "../types";
import { BucketIcon, Empty, Progress, RemainingText } from "./UI";
import { sumSpent, usage } from "../utils/money";
export function CategoryList({
  bucket,
  categories,
  transactions,
}: {
  bucket: Bucket;
  categories: Category[];
  transactions: Transaction[];
}) {
  const rows = categories
    .filter((c) => c.bucket === bucket && !c.archived)
    .sort((a, b) => a.order - b.order);
  return (
    <div className="category-list">
      {rows.length === 0 ? (
        <Empty
          title="Make room for what matters"
          text="Add a subcategory in Settings to start planning."
        />
      ) : (
        rows.map((c) => {
          const spent = sumSpent(transactions, undefined, c.id);
          return (
            <div className="category-budget-row" key={c.id}>
              <BucketIcon bucket={bucket} name={c.icon} />
              <div className="flex-1 min-w-0">
                <div className="row-between">
                  <strong>{c.name}</strong>
                  <span className="micro muted">
                    {usage(spent, c.limit)}% used
                  </span>
                </div>
                <p>
                  <RemainingText spent={spent} limit={c.limit} />
                </p>
                <Progress spent={spent} limit={c.limit} bucket={bucket} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
